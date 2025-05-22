import { AnyEditorialAssumption, Edit } from "linked-rolls";
import { RefObject } from "react";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../../helpers/getBoundingBox";
import { getBoxToBoxArrow } from "curved-arrows";

interface AssumptionUnderlayProps<T extends AnyEditorialAssumption> {
    assumption: T;
    svgRef: RefObject<SVGGElement>;
    onClick: (r: T) => void;
}

export const EditUnderlay = ({ assumption, svgRef, onClick }: AssumptionUnderlayProps<Edit>) => {
    if (!svgRef.current) return null

    const hulls = []

    // draw overall hull only when there are both, insertions
    // as well as deletions
    if (assumption.insert && assumption.delete) {
        const { hull } =
            getHull(
                [...(assumption.insert || []), ...(assumption.delete || [])]
                    .map(e => e.id), svgRef.current,
                7 // slightly larger padding, since it will be overlaid by insertion/deletion hulls
            );

        // also, draw an arrow from delete to insert 
        // in order to make clear the direction of the edit
        const arrowHeadSize = 3;
        const bbox1 = getBoundingBox(getHull(assumption.delete.map(e => e.id), svgRef.current).points);
        const bbox2 = getBoundingBox(getHull(assumption.insert.map(e => e.id), svgRef.current).points);

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
                    key={assumption.id}
                    id={assumption.id}
                    fillOpacity={0.05}
                    fill='red'
                    hull={hull}
                    onClick={() => onClick(assumption)}
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
    if (assumption.insert) {
        const { points, hull } = getHull(assumption.insert.map(e => e.id), svgRef.current);
        const bbox = getBoundingBox(points);

        hulls.push(
            <Hull
                key={`${assumption.id}-insert`}
                id={assumption.id}
                hull={hull}
                fillOpacity={0.05}
                fill='red'
                onClick={() => {
                    onClick(assumption)
                }}
                label={
                    !(assumption.insert && assumption.delete) && ( // don't show label if there is an overall hull
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
    if (assumption.delete) {
        const { points, hull } = getHull(assumption.delete.map(e => e.id), svgRef.current);
        const bbox = getBoundingBox(points);

        hulls.push(
            <Hull
                key={`${assumption.id}-delete`}
                id={assumption.id}
                hull={hull}
                fillOpacity={0.05}
                fill='red'
                onClick={() => onClick(assumption)}
                label={
                    !(assumption.insert && assumption.delete) && ( // don't show label if there is an overall hull
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

