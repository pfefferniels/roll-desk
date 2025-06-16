import { Intention } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { getEditBBox } from "./EditView";
import { usePinchZoom } from "../../hooks/usePinchZoom";

export interface IntentionViewProps {
    intention: Intention;
    onClick?: (intention: Intention) => void;
}

export const IntentionView = ({ intention, onClick }: IntentionViewProps) => {
    const translation = usePinchZoom()

    const bboxes = intention.belief.about
        .map(edit => getEditBBox(edit, translation));

    const hull = getHull(bboxes)
    const bbox = getBoundingBox(hull.points)

    return (
        <g>
            <Hull
                key={`${intention.id}`}
                id={`${intention.id}`}
                data-id={`${intention.id}}`}
                hull={hull.hull}
                fillOpacity={0.5}
                fill='red'
                onClick={() => {
                    onClick && onClick(intention)
                }}
                label={
                    <text
                        x={bbox.x}
                        y={bbox.y + bbox.height + 2}
                        fontSize={10}
                        fill='black'
                        style={{ pointerEvents: 'none' }}
                    >
                        {intention.description}
                    </text>
                }
            />
        </g>
    );
}

