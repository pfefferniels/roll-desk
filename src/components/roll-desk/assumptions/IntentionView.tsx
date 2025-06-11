import { Intention } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../../helpers/getBoundingBox";
import { inferencesOf } from "./QuestionTree";
import { getEditBBox, Translation } from "./EditView";
import { usePinchZoom } from "../../../hooks/usePinchZoom";

export const getIntentionBBox = (intention: Intention, translation: Translation) => {
    const bboxes = inferencesOf(intention)
        .map(inference => inference.premises)
        .flat()
        .filter(premise => premise.type === 'edit')
        .map(premise => getEditBBox(premise, translation));

    return getBoundingBox(getHull(bboxes).points);
}

export interface IntentionViewProps {
    intention: Intention;
    onClick?: (intention: Intention) => void;
}

export const IntentionView = ({ intention, onClick }: IntentionViewProps) => {
    const translation = usePinchZoom()

    const hulls =
        inferencesOf(intention)
            .map((inference, i) => {
                const bboxes = inference.premises
                    .filter(premise => premise.type === 'edit')
                    .map(premise => getEditBBox(premise, translation))

                const { points, hull } = getHull(bboxes, 10);
                const bbox = getBoundingBox(points);

                return (
                    <Hull
                        key={`${intention.id}_inference_${i}`}
                        id={`${intention.id}_inference_${i}`}
                        data-id={`${intention.id}_inference_${i}`}
                        hull={hull}
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
                )
            })

    return (
        <g>
            {...hulls}
        </g>
    );
}

