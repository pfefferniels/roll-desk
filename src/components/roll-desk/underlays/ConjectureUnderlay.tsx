import { Conjecture } from "linked-rolls";
import { AssumptionProps } from "./AssumptionProps";
import { getBoundingBox } from "../../../helpers/getBoundingBox";
import { getHull, Hull } from "./Hull";

export const ConjectureUnderlay = ({ assumption, svgRef, onClick }: AssumptionProps<Conjecture>) => {
    if (!svgRef.current) return null;

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