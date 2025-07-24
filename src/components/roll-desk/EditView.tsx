import { Edit, flat } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { MouseEventHandler } from "react";
import { AnySymbol, dimensionOf } from "linked-rolls/lib/Symbol";
import { PinchZoomContextProps, usePinchZoom } from "../../hooks/usePinchZoom";
import { Arrow } from "./Arrow";

export type Translation = Pick<PinchZoomContextProps, 'translateX' | 'trackToY' | 'trackHeight'>

const getSymbolBBox = (symbol: AnySymbol, { translateX, trackToY, trackHeight }: Translation) => {
    const dim = dimensionOf(symbol)

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

export const getEditBBoxes = (edit: Edit, translation: Translation) => {
    const insertionBBoxes = edit.insert?.map(s => getSymbolBBox(s, translation)) || [];
    const deletionBBoxes = edit.delete?.map(s => getSymbolBBox(s, translation)) || [];

    return [...insertionBBoxes, ...deletionBBoxes]
}

interface EditViewProps {
    edit: Edit;
    onClick?: MouseEventHandler;
}

export const EditView = ({ edit, onClick }: EditViewProps) => {
    const translation = usePinchZoom();

    const hulls = []

    const insertionBBoxes = edit.insert?.map(s => getSymbolBBox(s, translation)) || [];
    const deletionBBoxes = edit.delete?.map(s => getSymbolBBox(s, translation)) || [];

    // draw overall hull only when there are both, insertions
    // as well as deletions
    if (edit.insert?.length && edit.delete?.length) {
        if (edit.insert.length === 1 && edit.delete.length === 1) {
            // do not draw any hull, only the arrow
            const fromBox = getSymbolBBox(edit.delete[0], translation)
            const toBox = getSymbolBBox(edit.insert[0], translation);

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
                    >
                        +{edit.insert.length} {edit.motivation && flat(edit.motivation).replaceAll('-', ' ')}
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

