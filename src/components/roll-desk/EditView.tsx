import { Edit } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { getBoxToBoxArrow } from "curved-arrows";
import { MouseEventHandler } from "react";
import { AnySymbol, dimensionOf } from "linked-rolls/lib/Symbol";
import { PinchZoomContextProps, usePinchZoom } from "../../hooks/usePinchZoom";

export type Translation = Pick<PinchZoomContextProps, 'translateX' | 'trackToY' | 'trackHeight'>

const getSymbolBBox = (symbol: AnySymbol, { translateX, trackToY, trackHeight }: Translation) => {
    const dim = dimensionOf(symbol)

    let height = trackHeight.note
    if (dim.vertical.to) {
        height = trackToY(dim.vertical.to - dim.vertical.from);
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

export const getEditBBox = (edit: Edit, translation: Translation) => {
    const insertionBBoxes = edit.insert?.map(s => getSymbolBBox(s, translation)) || [];
    const deletionBBoxes = edit.delete?.map(s => getSymbolBBox(s, translation)) || [];

    return getBoundingBox(
        getHull([...insertionBBoxes, ...deletionBBoxes]).points
    );
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
    if (edit.insert && edit.delete) {
        const { hull } =
            getHull(
                [...insertionBBoxes, ...deletionBBoxes],
                7 // slightly larger padding, since it will be overlaid by insertion/deletion hulls
            );

        // also, draw an arrow from delete to insert 
        // in order to make clear the direction of the edit
        const arrowHeadSize = 3;
        const bbox1 = getBoundingBox(getHull(deletionBBoxes).points);
        const bbox2 = getBoundingBox(getHull(insertionBBoxes).points);

        const [sx, sy, c1x, c1y, c2x, c2y, ex, ey, ae] = getBoxToBoxArrow(
            bbox1.x,
            bbox1.y,
            bbox1.width,
            bbox1.height,
            bbox2.x,
            bbox2.y,
            bbox2.width,
            bbox2.height,
            {
                padStart: 1,
                padEnd: arrowHeadSize,
                controlPointStretch: Math.max(8, Math.abs(bbox1.x - bbox2.x) * 0.5),
                allowedStartSides: ['top'],
                allowedEndSides: ['top']
            }
        )
        const arrowPath = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;
        const arrowHead = (
            <polygon
                points={`0,${-arrowHeadSize} ${arrowHeadSize *
                    2},0, 0,${arrowHeadSize}`}
                transform={`translate(${ex}, ${ey}) rotate(${ae})`}
                fill='black'
            />
        )

        hulls.push(
            <>
                <Hull
                    key={edit.id}
                    id={edit.id}
                    fillOpacity={0.5}
                    fill='white'
                    hull={hull}
                    onClick={(e) => onClick && onClick(e)}
                    soft={true}
                />

                <g className='arrow'>
                    <path
                        stroke="black"
                        strokeWidth={2}
                        fill="none"
                        d={arrowPath} />
                    {arrowHead}
                </g>
            </>

        )
    }

    // draw hull for insertions
    if (edit.insert) {
        const { points, hull } = getHull(insertionBBoxes);
        const bbox = getBoundingBox(points);

        hulls.push(
            <Hull
                key={`${edit.id}-insert`}
                id={edit.id}
                hull={hull}
                fillOpacity={0.5}
                fill='white'
                onClick={(e) => {
                    onClick && onClick(e)
                }}
                label={
                    !(edit.insert && edit.delete) && ( // don't show label if there is an overall hull
                        <text
                            x={bbox.x}
                            y={bbox.y + bbox.height + 2}
                            fontSize={10}
                            fill='black'
                            style={{ pointerEvents: 'none' }}
                        >
                            +
                        </text>
                    )
                }
            />
        )
    }

    // draw hull for deletions
    if (edit.delete) {
        const { points, hull } = getHull(deletionBBoxes);
        const bbox = getBoundingBox(points);

        hulls.push(
            <Hull
                key={`${edit.id}-delete`}
                id={edit.id}
                data-id={edit.id}
                hull={hull}
                fillOpacity={0.5}
                fill='white'
                onClick={(e) => onClick && onClick(e)}
                label={
                    !(edit.insert && edit.delete) && ( // don't show label if there is an overall hull
                        <text
                            x={bbox.x}
                            y={bbox.y + bbox.height + 2}
                            fontSize={10}
                            fill='black'
                            style={{ pointerEvents: 'none' }}
                        >
                            -
                        </text>
                    )
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

