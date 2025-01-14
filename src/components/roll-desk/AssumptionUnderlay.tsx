import { RefObject } from "react";
import { roundedHull } from "../../helpers/roundedHull";
import { AnyEditorialAssumption } from "linked-rolls";
import { getBoxToBoxArrow } from "curved-arrows";

/**
 * 
 * @param ids SVG must contain elements with matching data-id attributes
 * @param svg SVG to search for elements in
 * @returns points and hull of the convex hull of the elements
 */
const getHull = (ids: string[], svg: SVGGElement) => {
    const points = ids
        .map(id => {
            return svg.querySelector(`[data-id="${id}"]`);
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
    assumption: AnyEditorialAssumption;
    svgRef: RefObject<SVGGElement>;
    onClick: (r: AnyEditorialAssumption) => void;
    witnessSigla?: Set<string>;
}

export const AssumptionUnderlay = ({ assumption, svgRef, onClick, witnessSigla }: AssumptionUnderlayProps) => {
    if (!svgRef.current) return null;

    if (assumption.type === 'handAssignment') {
        const { points, hull } = getHull(assumption.target.map(e => e.id), svgRef.current);
        const bbox = getBoundingBox(points);

        return (
            <g onClick={() => onClick(assumption)}>
                <path
                    id={assumption.id}
                    stroke='black'
                    fill='white'
                    fillOpacity={0.1}
                    strokeWidth={1}
                    d={hull} />

                <text
                    x={bbox.x}
                    y={bbox.y + bbox.height + 10}
                    fontSize={8}
                    fill='black'
                >
                    {assumption.hand.carriedOutBy}
                </text>
            </g>
        );
    }
    else if (assumption.type === 'conjecture') {
        const { points, hull } = getHull(assumption.with.map(e => e.id), svgRef.current);
        const bbox = getBoundingBox(points);

        return (
            <g onClick={() => onClick(assumption)}>
                <path
                    id={assumption.id}
                    stroke='black'
                    fill='white'
                    fillOpacity={0.1}
                    strokeWidth={1}
                    d={hull} />

                <text
                    x={bbox.x}
                    y={bbox.y + bbox.height + 10}
                    fontSize={8}
                    fill='black'
                >
                    {assumption.type} ({assumption.certainty})
                </text>
            </g>
        );
    }
    else if (assumption.type === 'edit') {
        const { points, hull } = getHull(assumption.contains.map(e => e.id), svgRef.current);
        const bbox2 = getBoundingBox(points);

        let arrowPath, arrowHead
        if (assumption.follows) {
            const arrowHeadSize = 3;

            const bbox1 = getBoundingBox(getHull(assumption.follows.contains.map(e => e.id), svgRef.current).points);

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

        return (
            <g onClick={() => onClick(assumption)}>
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

                <path
                    id={assumption.id}
                    stroke='black'
                    fill='white'
                    fillOpacity={0.1}
                    strokeWidth={1}
                    d={hull} />

                {(points.length > 0 && witnessSigla) && (
                    <text
                        x={bbox2.x}
                        y={bbox2.y + bbox2.height + 10}
                        fontSize={8}
                        fill='black'
                    >
                        {[...witnessSigla].join('|')}
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
            </g>
        );
    }
};
