import { Edit, flat } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { MouseEventHandler, useContext } from "react";
import { AnySymbol } from "linked-rolls/lib/Symbol";
import { PinchZoomContextProps, usePinchZoom } from "../../hooks/usePinchZoom";
import { Arrow } from "./Arrow";
import { EditionView } from "linked-rolls/lib/EditionView";
import { EditionContext } from "../../providers/EditionContext";

export type Translation = Pick<PinchZoomContextProps, 'translateX' | 'trackToY' | 'trackHeight'>

const getSymbolBBox = (symbol: AnySymbol, editionView: EditionView, { translateX, trackToY, trackHeight }: Translation) => {
    const dim = editionView.dimensionOf(symbol)
    if (!dim) return undefined

    let height = trackHeight.note
    if (dim.vertical.to) {
        height = trackToY(dim.vertical.to - dim.vertical.from);
        console.log('new height', height)
    }
    else if (symbol.type === 'note' || symbol.type === 'expression') {
        height = trackHeight[symbol.type];
    }

    return {
        x: translateX(dim.horizontal.from),
        y: trackToY(dim.vertical.from),
        width: translateX(dim.horizontal.to - dim.horizontal.from),
        height
    }
}

export const getEditBBoxes = (edit: Edit, editionView: EditionView, translation: Translation) => {
    const insertionBBoxes = edit.insert?.map(s => getSymbolBBox(s, editionView, translation)) || [];
    const deletionBBoxes = (edit.delete ?? [])
        .map(symbolId => editionView.get<AnySymbol>(symbolId))
        .filter(s => !!s)
        .map(s => getSymbolBBox(s, editionView, translation))
        .filter(bbox => !!bbox);

    return [...insertionBBoxes, ...deletionBBoxes]
}

interface EditViewProps {
    edit: Edit;
    onClick?: MouseEventHandler;
}

export const EditView = ({ edit, onClick }: EditViewProps) => {
    const { view } = useContext(EditionContext)
    const translation = usePinchZoom();

    if (!view) return null

    const hulls = []

    const insertionBBoxes = (edit.insert ?? [])
        .map(s => getSymbolBBox(s, view, translation))
        .filter(bbox => !!bbox)
    const deletionBBoxes = (edit.delete ?? [])
        .map(symbolId => view.get<AnySymbol>(symbolId))
        .filter(s => !!s)
        .map(s => getSymbolBBox(s, view, translation))
        .filter(bbox => !!bbox);

    // draw overall hull only when there are both, insertions
    // as well as deletions
    if (edit.insert?.length && edit.delete?.length) {
        if (edit.insert.length === 1 && edit.delete.length === 1) {
            // do not draw any hull, only the arrow
            const deletedSymbol = view.get<AnySymbol>(edit.delete[0])
            if (!deletedSymbol) return null

            const fromBox = getSymbolBBox(deletedSymbol, view, translation)
            const toBox = getSymbolBBox(edit.insert[0], view, translation);
            if (!fromBox || !toBox) return null

            fromBox.width = 2
            toBox.width = 2

            return (
                <Arrow
                    from={fromBox}
                    to={toBox}
                    onClick={onClick}
                    svgProps={{ id: edit.id }}
                />
            )
        }

        const deletionBBox = getBoundingBox(getHull(deletionBBoxes).points);
        const insertionBBox = getBoundingBox(getHull(insertionBBoxes).points);

        hulls.push(
            <>
                <Arrow
                    from={deletionBBox}
                    to={insertionBBox}
                    onClick={onClick}
                    svgProps={{ id: edit.id }}
                />
            </>

        )
    }

    // draw hull for insertions
    if (edit.insert?.length) {
        const { points, hull } = getHull(insertionBBoxes);
        const bbox = getBoundingBox(points);
        const id = edit.delete?.length
            ? `${edit.id}-insert` :
            edit.id
        let motivationStr = `+${edit.insert.length}`
        if (edit.motivation) {
            if (flat(edit.motivation) === 'additional-accent') {
                motivationStr = '>'
            }
            else if (flat(edit.motivation) === 'correct-error') {
                motivationStr = `fix`
            }
            else {
                motivationStr += ` ${flat(edit.motivation).replaceAll('-', ' ')}`
            }
        }

        hulls.push(
            <Hull
                key={`${edit.id}-insert`}
                id={id}
                hull={hull}
                fillOpacity={0.5}
                fill='lightgray'
                onClick={(e) => {
                    onClick && onClick(e)
                }}
                label={
                    <text
                        x={bbox.x + 8}
                        y={bbox.y + bbox.height + 8}
                        fontSize={12}
                        fill='black'
                        style={{ pointerEvents: 'none' }}
                        fontWeight='bold'
                    >
                        {motivationStr}
                    </text>
                }
            />
        )
    }

    // draw hull for deletions
    if (edit.delete?.length) {
        const { points, hull } = getHull(deletionBBoxes);
        const bbox = getBoundingBox(points);
        const id = edit.insert?.length
            ? `${edit.id}-delete` :
            edit.id


        hulls.push(
            <Hull
                key={`${edit.id}-delete`}
                id={id}
                hull={hull}
                fillOpacity={0.5}
                fill='lightgray'
                onClick={(e) => onClick && onClick(e)}
                label={
                    <text
                        x={bbox.x + 8}
                        y={bbox.y + bbox.height + 8}
                        fontSize={12}
                        fill='black'
                        style={{ pointerEvents: 'none' }}
                    >
                        -{edit.delete.length}
                    </text>
                }
            />
        )
    }

    return (
        <g>
            {...hulls}
        </g>
    );
}

