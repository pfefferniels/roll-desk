import { MouseEventHandler, ReactNode, RefObject } from "react";
import { roundedHull } from "../../helpers/roundedHull";
import { AnyEditorialAssumption } from "linked-rolls";
import { getBoxToBoxArrow } from "curved-arrows";

/**
 * 
 * @param ids SVG must contain elements with matching data-id attributes
 * @param svg SVG to search for elements in
 * @returns points and hull of the convex hull of the elements
 */
const getHull = (ids: string[], svg: SVGGElement, hullPadding = 3) => {
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
    const hull = roundedHull(points, hullPadding);
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

interface HullProps {
    id: string
    hull: string;
    label?: ReactNode;
    onClick: MouseEventHandler
    soft?: boolean
    fillOpacity?: number
    fill?: string
}

const Hull = ({ id, hull, onClick, label, soft, fill, fillOpacity }: HullProps) => {
    return (
        <g
            className='hull'
            onClick={onClick}
        >
            <path
                data-id={id}
                id={id}
                stroke={soft ? 'none' : 'black'}
                fill={fill || (soft ? 'gray' : 'white')}
                fillOpacity={fillOpacity || (soft ? 0.2 : 0.8)}
                strokeWidth={0.3}
                strokeDasharray={soft ? 'none' : '5 1'}
                d={hull}
            />
            {label}
        </g>
    );
}

interface AssumptionUnderlayProps {
    assumption: AnyEditorialAssumption;
    svgRef: RefObject<SVGGElement>;
    onClick: (r: AnyEditorialAssumption) => void;
}

export const AssumptionUnderlay = ({ assumption, svgRef, onClick }: AssumptionUnderlayProps) => {
    if (!svgRef.current) return null;

    if (assumption.type === 'handAssignment') {
        const { points, hull } = getHull(assumption.target.map(e => e.id), svgRef.current);
        const bbox = getBoundingBox(points);

        return (
            <Hull
                id={assumption.id}
                hull={hull}
                onClick={() => onClick(assumption)}
                label={
                    <text
                        x={bbox.x}
                        y={bbox.y + bbox.height + 10}
                        fontSize={8}
                        fill='black'
                    >
                        {assumption.hand.carriedOutBy}
                    </text>
                }
            />
        )
    }
    else if (assumption.type === 'conjecture') {
        const { points, hull } = getHull(assumption.with.map(e => e.id), svgRef.current);
        const bbox = getBoundingBox(points);

        return (
            <Hull
                id={assumption.id}
                hull={hull}
                onClick={() => onClick(assumption)}
                label={
                    <text
                        x={bbox.x}
                        y={bbox.y + bbox.height + 10}
                        fontSize={8}
                        fill='black'
                    >
                        {assumption.type} ({assumption.certainty})
                    </text>
                }
            />
        );
    }
    else if (assumption.type === 'intention') {
        const inferences = assumption.reasons?.filter(reason => reason.type === 'inference') || []
        const allIds: string[] = []
        // collect IDs of collated events
        for (const inference of inferences) {
            for (const premise of inference.premises) {
                if (premise.type === 'edit') {
                    allIds.push(
                        ...(premise.insert || []).map(({ id }) => id),
                        ...(premise.delete || []).map(({ id }) => id)
                    );
                }
            }
        }

        const { points, hull } = getHull(allIds, svgRef.current, 25)
        const bbox = getBoundingBox(points);

        return (
            <Hull
                hull={hull}
                id={assumption.id}
                onClick={() => onClick(assumption)}
                fillOpacity={0.05}
                fill='red'
                label={
                    <text
                        dominantBaseline='top'
                        x={bbox.x}
                        y={bbox.y + bbox.height + 25}
                        fontSize={8}
                        fill='black'
                    >
                        {assumption.description}
                    </text>
                }
            />
        )
    }
    else if (assumption.type === 'edit') {
        const hulls = []

        // draw overall hull only when there are both, insertions
        // as well as deletions
        if (assumption.insert && assumption.delete) {
            const { points, hull } =
                getHull(
                    [...(assumption.insert || []), ...(assumption.delete || [])]
                        .map(e => e.id), svgRef.current,
                    7 // slightly larger padding, since it will be overlaid by insertion/deletion hulls
                );
            const bbox = getBoundingBox(points);

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
                        hull={hull}
                        onClick={() => onClick(assumption)}
                        label={
                            <text
                                x={bbox.x}
                                y={bbox.y + bbox.height + 10}
                                fontSize={8}
                                fill='black'
                            >

                            </text>
                        }
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
                    onClick={() => onClick(assumption)}
                    label={
                        !(assumption.insert && assumption.delete) && ( // don't show label if there is an overall hull
                            <text
                                x={bbox.x}
                                y={bbox.y + bbox.height + 2}
                                fontSize={10}
                                fill='black'
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
};
