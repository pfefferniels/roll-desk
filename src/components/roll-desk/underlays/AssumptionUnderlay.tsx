import { RefObject } from "react";
import { AnyEditorialAssumption } from "linked-rolls";
import { getBoxToBoxArrow } from "curved-arrows";
import { MultilineText } from "../MultilineText";
import { getHull, Hull } from "./Hull";
import { BBox, getBoundingBox } from "../../../helpers/getBoundingBox";
import { EditUnderlay } from "./EditUnderlay";
import { ConjectureUnderlay } from "./ConjectureUnderlay";

const inferencesOf = (assumption: AnyEditorialAssumption) => {
    if (!assumption.reasons) return []
    return assumption.reasons
        .filter(r => r.type === 'inference')
        .flat()
}

const unpack = (acc: BBox[], assumption: AnyEditorialAssumption, svgEl: SVGGElement) => {
    if (assumption.type === 'edit') {
        const ids = [
            ...(assumption.insert || []).map(e => e.id),
            ...(assumption.delete || []).map(e => e.id)
        ]
        const { points } = getHull(ids, svgEl);
        const bbox = getBoundingBox(points);
        acc.push(bbox);
    }
    else if (assumption.type === 'intention') {
        const inferences = inferencesOf(assumption)
        for (const inference of inferences) {
            // get one bbox for every inference
            const premises = inference.premises
            const ids = []
            for (const premise of premises) {
                if (premise.type === 'edit') {
                    ids.push(
                        ...(premise.insert || []).map(e => e.id),
                        ...(premise.delete || []).map(e => e.id)
                    )
                }
            }

            const { points } = getHull(ids, svgEl);
            const bbox = getBoundingBox(points);
            acc.push(bbox);
        }
    }
    else if (assumption.type === 'question') {
        const inferences = inferencesOf(assumption)
        for (const inference of inferences) {
            const premises = inference.premises
            for (const premise of premises) {
                unpack(acc, premise, svgEl)
            }
        }
    }
    return acc
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
        return <ConjectureUnderlay {...{ assumption, svgRef, onClick }} />
    }
    else if (assumption.type === 'intention') {
        const inferences = assumption.reasons?.filter(reason => reason.type === 'inference') || []

        const hulls = []
        for (const inference of inferences) {
            // collect IDs of collated events
            const allIds: string[] = []
            for (const premise of inference.premises) {
                if (premise.type === 'edit') {
                    allIds.push(
                        ...(premise.insert || []).map(({ id }) => id),
                        ...(premise.delete || []).map(({ id }) => id)
                    );
                }
            }

            const { points, hull } = getHull(allIds, svgRef.current, 25)
            const bbox = getBoundingBox(points);

            hulls.push((
                <Hull
                    key={`intention_${assumption.id}`}
                    hull={hull}
                    id={assumption.id}
                    onClick={() => onClick(assumption)}
                    fillOpacity={0.05}
                    fill='red'
                    label={
                        <MultilineText
                            text={assumption.description}
                            maxWidth={200}
                            svgProps={{
                                x: bbox.x,
                                y: bbox.y + bbox.height + 35,
                                fontSize: 11,
                            }}
                        />
                    }
                />
            ))
        }

        return hulls
    }
    else if (assumption.type === 'edit') {
        return <EditUnderlay {...{ assumption, svgRef, onClick }} />
    }
    else if (assumption.type === 'question') {
        if (!assumption.reasons) return null

        const bboxes: BBox[] = []
        unpack(bboxes, assumption, svgRef.current)

        const xs = bboxes.map(bbox => bbox.x)
        const cx = xs.reduce((acc, x) => acc + x, 0) / xs.length
        let cy = (bboxes.reduce((acc, bbox) => acc + bbox.y, 0) / bboxes.length)

        const svgHeight = 880 // TODO: svgRef.current.clientHeight does not seem to work

        const placement = cy > (svgHeight / 2) ? 'bottom' : 'top'
        cy += placement === 'bottom' ? 100 : -100

        const arrows = bboxes
            .map(bbox => {
                const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = getBoxToBoxArrow(
                    cx,
                    cy,
                    0,
                    0,
                    bbox.x,
                    bbox.y,
                    bbox.width,
                    bbox.height,
                    {
                        padStart: 0,
                        padEnd: 0,
                        allowedStartSides: [placement === 'bottom' ? 'top' : 'bottom'],
                        allowedEndSides: [placement],
                    }
                )

                const arrowPath = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;

                return (
                    <path
                        key={bbox.x}
                        stroke="black"
                        strokeWidth={2}
                        strokeOpacity={0.4}
                        fill="none"
                        d={arrowPath}
                    />
                )
            })

        return (
            <g>
                {arrows}
                <MultilineText
                    text={assumption.question}
                    maxWidth={200}
                    svgProps={{
                        x: cx,
                        y: cy,
                        fontSize: 12,
                        textAnchor: 'middle'
                    }}
                />
            </g>
        )
    }
};
