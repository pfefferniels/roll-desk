import { RefObject } from "react";
import { roundedHull } from "../../helpers/roundedHull";
import { AnyEditorialAction } from "linked-rolls";
import { getBoxToBoxArrow } from "curved-arrows";
import { Edit } from "linked-rolls/lib/EditorialActions";
import { CollatedEvent } from "linked-rolls/lib/types";

const getHull = (assumption: Edit, svg: SVGGElement) => {
    const points = assumption.contains
        .map(e => {
            return svg.querySelector(`[data-id="${e.id}"]`);
        })
        .filter(el => !!el)
        .map(el => {
            const bbox = (el as SVGGraphicsElement).getBBox();
            return [
                [bbox.x, bbox.y] as [number, number],
                [bbox.x + bbox.width, bbox.y] as [number, number],
                [bbox.x, bbox.y + bbox.height] as [number, number],
                [bbox.x + bbox.width, bbox.y + bbox.height] as [number, number]
            ];
        })
        .flat();
    const hull = roundedHull(points, 3);
    return { points, hull };
};

const getBoundingBox = (points: [number, number][]) => {
    const minX = Math.min(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1]));
    const maxX = Math.max(...points.map(p => p[0]));
    const maxY = Math.max(...points.map(p => p[1]));

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
};

interface AssumptionUnderlayProps {
    assumption: AnyEditorialAction;
    svgRef: RefObject<SVGGElement>;
    onClick: (r: AnyEditorialAction) => void;
    retrieveSigla: (events: CollatedEvent[]) => string[]
}

export const AssumptionUnderlay = ({ assumption, svgRef, onClick, retrieveSigla }: AssumptionUnderlayProps) => {
    if (!svgRef.current) return null;

    if (assumption.type === 'edit') {
        const { points, hull } = getHull(assumption, svgRef.current);
        const bbox2 = getBoundingBox(points);

        let arrowPath, arrowHead
        if (assumption.follows) {
            const arrowHeadSize = 3;

            const bbox1 = getBoundingBox(getHull(assumption.follows, svgRef.current).points);

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
                    controlPointStretch: 20
                }
            )
            arrowPath = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;

            arrowHead = (
                <polygon
                    points={`0,${-arrowHeadSize} ${arrowHeadSize *
                        2},0, 0,${arrowHeadSize}`}
                    transform={`translate(${ex}, ${ey}) rotate(${ae})`}
                    fill='black'
                />
            )
        }

        const sigla = retrieveSigla(assumption.contains);

        return (
            <g onClick={() => onClick(assumption)}>
                <path
                    id={assumption.id}
                    stroke='black'
                    fill='white'
                    fillOpacity={0.1}
                    strokeWidth={1}
                    d={hull} />

                {points.length > 0 && (
                    <text
                        x={bbox2.x}
                        y={bbox2.y + bbox2.height + 10}
                        fontSize={8}
                        fill='black'
                    >
                        {sigla.join('|')}
                    </text>
                )}

                {arrowPath && (
                    <>
                        <path
                            stroke="black"
                            strokeWidth={2}
                            fill="none"
                            d={arrowPath} />
                        {arrowHead}
                    </>
                )}

                {(assumption.action && points.length > 0) && (
                    <text
                        x={bbox2.x}
                        y={bbox2.y}
                        fontSize={10}
                        fill='black'
                    >
                        {assumption.action}
                    </text>
                )}
            </g>
        );
    }
};
