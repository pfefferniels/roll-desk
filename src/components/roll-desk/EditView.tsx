import { Edit, EditType } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { MouseEventHandler, useContext } from "react";
import { AnySymbol } from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { Arrow } from "./Arrow";
import { EditionView } from "linked-rolls";
import { EditionContext } from "../../providers/EditionContext";
import { Box, boxOf, Translation } from "../../helpers/rollGeometry";

export type { Translation }

const insertionFill = '#aceebb'
const deletionFill = '#fb7f78ff'

export const getSymbolBBox = (symbol: AnySymbol, editionView: EditionView, translation: Translation) => {
    const dim = editionView.dimensionOf(symbol)
    if (!dim) return undefined

    return boxOf(dim, translation)
}

interface EditBoxes {
    insertions: Box[]
    deletions: Box[]
}

/** Where an edit is drawn, the boxes it inserts apart from the ones it deletes. */
export const editBoxes = (edit: Edit, editionView: EditionView, translation: Translation): EditBoxes => ({
    insertions: (edit.insert ?? [])
        .map(symbol => getSymbolBBox(symbol, editionView, translation))
        .filter(bbox => !!bbox),
    deletions: (edit.delete ?? [])
        .map(symbolId => editionView.get<AnySymbol>(symbolId))
        .filter(symbol => !!symbol)
        .map(symbol => getSymbolBBox(symbol, editionView, translation))
        .filter(bbox => !!bbox)
})

export const getEditBBoxes = (edit: Edit, editionView: EditionView, translation: Translation) => {
    const { insertions, deletions } = editBoxes(edit, editionView, translation)
    return [...insertions, ...deletions]
}

/** The word written under an edit's insertions, where its type calls for one. */
export const editTypeLabel = (editType: EditType | undefined): string | undefined => {
    if (!editType) return undefined
    if (editType === 'additional-accent') return '>'
    if (editType === 'correct-error') return 'fix'
    // a shift is already told by the arrow from the old place to the new one
    if (editType === 'shift') return undefined
    return editType.replaceAll('-', ' ')
}

/** An edit that inserts as well as deletes draws two hulls, so each needs its own id. */
export const hullId = (edit: Edit, part: 'insert' | 'delete'): string =>
    (edit.insert?.length && edit.delete?.length)
        ? `${edit.id}-${part}`
        : edit.id

interface EditHullProps {
    id: string
    boxes: Box[]
    fill: string
    label?: string
    onClick?: MouseEventHandler
}

/** The hull around one side of an edit, the inserted symbols or the deleted ones. */
const EditHull = ({ id, boxes, fill, label, onClick }: EditHullProps) => {
    const { points, hull } = getHull(boxes)
    const bbox = getBoundingBox(points)

    return (
        <Hull
            id={id}
            hull={hull}
            fillOpacity={0.8}
            fill={fill}
            onClick={e => onClick?.(e)}
            label={label && (
                <text
                    x={bbox.x + 8}
                    y={bbox.y + bbox.height + 8}
                    fontSize={12}
                    fill='black'
                    style={{ pointerEvents: 'none' }}
                    fontWeight='bold'
                >
                    {label}
                </text>
            )}
        />
    )
}

interface EditViewProps {
    edit: Edit;
    onClick?: MouseEventHandler;
}

export const EditView = ({ edit, onClick }: EditViewProps) => {
    const { view } = useContext(EditionContext)
    const translation = usePinchZoom()

    if (!view) return null

    const { insertions, deletions } = editBoxes(edit, view, translation)
    const inserted = edit.insert?.length ?? 0
    const deleted = edit.delete?.length ?? 0

    // one symbol put in the place of one other: the arrow alone says it
    if (inserted === 1 && deleted === 1) {
        const [from] = deletions
        const [to] = insertions
        if (!from || !to) return null

        return (
            <Arrow
                from={{ ...from, width: 2 }}
                to={{ ...to, width: 2 }}
                onClick={onClick}
                svgProps={{ id: edit.id }}
            />
        )
    }

    // an arrow between the two hulls only where there are both
    const arrow = (inserted > 0 && deleted > 0) && (
        <Arrow
            from={getBoundingBox(getHull(deletions).points)}
            to={getBoundingBox(getHull(insertions).points)}
            onClick={onClick}
            svgProps={{ id: edit.id }}
        />
    )

    return (
        <g>
            {arrow}

            {inserted > 0 && (
                <EditHull
                    id={hullId(edit, 'insert')}
                    boxes={insertions}
                    fill={insertionFill}
                    label={editTypeLabel(edit.editType)}
                    onClick={onClick}
                />
            )}

            {deleted > 0 && (
                <EditHull
                    id={hullId(edit, 'delete')}
                    boxes={deletions}
                    fill={deletionFill}
                    onClick={onClick}
                />
            )}
        </g>
    );
}
