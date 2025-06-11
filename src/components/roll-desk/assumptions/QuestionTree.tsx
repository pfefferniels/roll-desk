import { AnyEditorialAssumption, Question } from "linked-rolls";
import { EditView } from "./EditView";
import { QuestionView } from "./QuestionUnderlay";
import { IntentionView } from "./IntentionView";

export const inferencesOf = (assumption: AnyEditorialAssumption) => {
    if (!assumption.reasons) return []
    return assumption.reasons
        .filter(r => r.type === 'inference')
        .flat()
}

function traceInferences<T>(
    assumption: AnyEditorialAssumption,
    callback: (assumption: AnyEditorialAssumption) => T
): T[] {
    const arr: T[] = []
    arr.push(callback(assumption))
    for (const inference of inferencesOf(assumption)) {
        const premises = inference.premises
        for (const premise of premises) {
            arr.push(...traceInferences(premise, callback))
        }
    }
    return arr
}

interface QuestionTree {
    questions: Question[];
    onClick: (question: Question) => void;
    svgWidth: number;
    svgHeight: number;
}

export const QuestionTree = ({ questions, onClick, svgWidth, svgHeight }: QuestionTree) => {
    const root: Question = {
        certainty: 'true',
        question: '',
        id: 'root',
        type: 'question',
        reasons: [
            {
                type: 'inference',
                premises: questions
            }
        ]
    }

    const assumptions =
        traceInferences(root, (assumption) => {
            if (assumption.type === 'edit') {
                return (
                    <EditView
                        key={assumption.id}
                        edit={assumption}
                    />
                )
            }
            else if (assumption.type === 'question') {
                return (
                    <QuestionView
                        key={assumption.id}
                        question={assumption}
                        onClick={onClick}
                    />
                )
            }
            else if (assumption.type === 'intention') {
                return (
                    <IntentionView
                        key={assumption.id}
                        intention={assumption}
                        onClick={() => { }}
                    />
                )
            }
            else {
                return <span>Unsupported assumption type</span>
            }
        })


    return (
        <svg width={svgWidth} height={svgHeight}>
            {assumptions}
        </svg>
    )
}
