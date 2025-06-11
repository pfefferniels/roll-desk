import { Question } from "linked-rolls";
import { inferencesOf } from "./QuestionTree";
import { getEditBBox } from "./EditView";
import { usePinchZoom } from "../../../hooks/usePinchZoom";
import { getIntentionBBox } from "./IntentionView";

interface QuestionViewProps {
    question: Question;
    onClick: (question: Question) => void;
}

export const QuestionView = ({ question, onClick }: QuestionViewProps) => {
    const translation = usePinchZoom()
    // a premise could be an intention or an edit (or another question?)
    const premises = inferencesOf(question).map(inference => inference.premises).flat()

    const targetBBoxes =
        premises
            .map(premise => {
                if (premise.type === 'edit') {
                    return getEditBBox(premise, translation)
                }
                else if (premise.type === 'intention') {
                    return getIntentionBBox(premise, translation)
                }
            })
            .flat()
            .filter(el => !!el)

    return (
        <>
            {targetBBoxes.map((bbox, i) => {
                const x = bbox.x + 0.9 * bbox.width
                const y = bbox.y

                return (
                    <g key={`${question.id}_target_${i}`}>
                        <circle
                            cx={x}
                            cy={y}
                            r={10}
                            fill="white"
                            fillOpacity={0.8}
                            stroke="gray"
                            strokeWidth={2}
                        />
                        <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill='gray'
                            fontSize={15}
                            fontWeight='bold'
                            onClick={() => onClick(question)}
                        >
                            ?
                        </text>
                    </g>
                )
            })}
        </>
    )
}
