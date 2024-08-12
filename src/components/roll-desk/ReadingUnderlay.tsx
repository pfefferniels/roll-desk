import type { Assumption } from "linked-rolls/lib/types";
import { RefObject } from "react";
import { roundedHull } from "../../helpers/roundedHull";

interface AssumptionUnderlayProps {
    assumption: Assumption;
    svgRef: RefObject<SVGGElement>;
    onClick: (r: Assumption) => void;
}

export const AssumptionUnderlay = ({ assumption, svgRef, onClick }: AssumptionUnderlayProps) => {
    if (!svgRef.current) return null;

    if (assumption.type === 'relation') {
        const allPoints = []
        const hulls: string[] = []
        for (const reading of assumption.relates) {
            const points = reading.contains
                .map(e => {
                    return svgRef.current?.querySelector(`[data-id="${e.id}"]`);
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
            const hull = roundedHull(points, 0.2);
            hulls.push(hull)
            allPoints.push(...points)
        }
        const overallHull = roundedHull(allPoints, 2)

        return (
            <g>
                <path
                    id={assumption.id}
                    stroke='black'
                    fill='white'
                    fillOpacity={0.7}
                    strokeWidth={1}
                    d={overallHull}
                    onClick={() => onClick(assumption)} />

                {hulls.map((hull, i) => (
                    <path
                        key={`subHull_${assumption.id}_${i}`}
                        stroke='black'
                        fill='white'
                        fillOpacity={0.5}
                        strokeWidth={0.5}
                        d={hull} />
                ))}
            </g>
        );
    }
};
