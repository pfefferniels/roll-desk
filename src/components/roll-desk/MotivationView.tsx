import { Edit, flat, isEdit, isMeaningComprehension, Motivation } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { getEditBBox } from "./EditView";
import { usePinchZoom } from "../../hooks/usePinchZoom";

export interface MotivationViewProps {
    motivation: Motivation<string>;
    onClick?: (motivation: Motivation<string>) => void;
}

export const MotivationView = ({ motivation, onClick }: MotivationViewProps) => {
    const translation = usePinchZoom()

    const bboxes = (motivation.belief?.reasons || [])
        .filter(reason => isMeaningComprehension<Edit>(reason, isEdit))
        .map(({ comprehends }) => comprehends)
        .flat()
        .map(edit => getEditBBox(edit, translation));

    const hull = getHull(bboxes)
    const bbox = getBoundingBox(hull.points)

    return (
        <g>
            <Hull
                key={`${motivation.id}`}
                id={`${motivation.id}`}
                data-id={`${motivation.id}}`}
                hull={hull.hull}
                fillOpacity={0.5}
                fill='red'
                onClick={() => {
                    onClick && onClick(motivation)
                }}
                label={
                    <text
                        x={bbox.x}
                        y={bbox.y + bbox.height + 20}
                        fontSize={12}
                        fill='black'
                        style={{ pointerEvents: 'none' }}
                    >
                        {flat(motivation)}
                    </text>
                }
            />
        </g>
    );
}

