import { Edit, EditType, isPerforation, positionOfSameFunction, Track, TrackerBar } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { MouseEventHandler, useContext, useMemo } from "react";
import { AnySymbol } from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { Arrow } from "./Arrow";
import { EditionView } from "linked-rolls";
import { EditionContext } from "../../providers/EditionContext";
import { Box, boxOf, rollGeometry, Translation } from "../../helpers/rollGeometry";

export type { Translation }

const insertionFill = '#aceebb'
const deletionFill = '#fb7f78ff'

/**
 * The lane a symbol is drawn in: the one the bar reads it on, and where
 * it has no word for it, the one it gives the same function.
 *
 * The track is the bar's answer rather than the carriers', since copies
 * of two systems number their tracks differently and a symbol may be
 * carried by both. The fallback is for what a version does away with: a
 * green version deletes the red `SlowCrescendoOn` it inherits, and the
 * green bar has no position for that, so the edit would have nowhere to
 * be drawn and would vanish instead of being shown.
 */
const laneOf = (symbol: AnySymbol, bar: TrackerBar): Track | undefined => {
    if (!isPerforation(symbol)) return undefined

    const read = bar.positionOf(symbol)
    if (read !== undefined) return read

    return symbol.type === 'expression' ? positionOfSameFunction(bar, symbol) : undefined
}

export const getSymbolBBox = (symbol: AnySymbol, editionView: EditionView, translation: Translation) => {
    const horizontal = editionView.placeOf(symbol)
    const position = laneOf(symbol, translation.bar)
    if (!horizontal || position === undefined) return undefined

    return boxOf({ horizontal, vertical: { from: position } }, translation)
}

interface EditBoxes {
    insertions: Box[]
    deletions: Box[]
}

/**
 * Where an edit is drawn, the boxes it inserts apart from the ones it
 * deletes.
 *
 * What a version does away with is drawn where it stood, which for a
 * version coded for another system means the bar its parent was coded
 * for: a green version's deletions are red commands, and the arrow
 * saying what became of them ought to start from the lane the red scale
 * put them in.
 */
export const editBoxes = (
    edit: Edit,
    editionView: EditionView,
    translation: Translation,
    deletedIn: Translation = translation
): EditBoxes => ({
    insertions: (edit.insert ?? [])
        .map(symbol => getSymbolBBox(symbol, editionView, translation))
        .filter(bbox => !!bbox),
    deletions: (edit.delete ?? [])
        .map(symbolId => editionView.get<AnySymbol>(symbolId))
        .filter(symbol => !!symbol)
        .map(symbol => getSymbolBBox(symbol, editionView, deletedIn))
        .filter(bbox => !!bbox)
})

export const getEditBBoxes = (
    edit: Edit,
    editionView: EditionView,
    translation: Translation,
    deletedIn: Translation = translation
) => {
    const { insertions, deletions } = editBoxes(edit, editionView, translation, deletedIn)
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
    /**
     * The bar the version this is based on was coded for, where that is
     * another system's. What the edit deletes is drawn by it.
     */
    deletedOn?: TrackerBar;
    onClick?: MouseEventHandler;
}

export const EditView = ({ edit, deletedOn, onClick }: EditViewProps) => {
    const { view } = useContext(EditionContext)
    const translation = usePinchZoom()
    const { trackHeight, spacing, bar } = translation

    // Laying the other bar out the same way puts a deleted command where
    // its own scale had it, which is what the arrow should start from.
    const deletedIn = useMemo(
        () => deletedOn && deletedOn.id !== bar.id
            ? { ...translation, ...rollGeometry(trackHeight, spacing, deletedOn) }
            : translation,
        [deletedOn, bar, translation, trackHeight, spacing]
    )

    if (!view) return null

    const { insertions, deletions } = editBoxes(edit, view, translation, deletedIn)
    // What is drawn, not what the edit names: a symbol no bar can place
    // has no box, and an arrow to or from nothing draws nothing.
    const inserted = insertions.length
    const deleted = deletions.length

    /**
     * An edit that both inserts and deletes puts one thing in the place
     * of another, and the arrow from the old to the new says that on its
     * own. Hulls and a word as well would say it three times over, which
     * on a transfer between systems is every expression on the roll.
     */
    if (inserted > 0 && deleted > 0) {
        return (
            <Arrow
                from={getBoundingBox(getHull(deletions).points)}
                to={getBoundingBox(getHull(insertions).points)}
                onClick={onClick}
                svgProps={{ id: edit.id }}
            />
        )
    }

    return (
        <g>

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
