import { Edit, isEdit, isMeaningComprehension, Motivation } from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getEditBBoxes } from "./EditView";
import { usePinchZoom } from "../../hooks/usePinchZoom";

export interface MotivationViewProps {
    motivation: Motivation<string>;
    onClick?: (motivation: Motivation<string>) => void;
}

export const MotivationView = ({ motivation, onClick }: MotivationViewProps) => {
    const translation = usePinchZoom()

    const hulls = (motivation.belief?.reasons || [])
        .filter(reason => isMeaningComprehension<Edit>(reason, isEdit))
        .map(({ comprehends }) => comprehends)
        .flat()
        .map(edit => getEditBBoxes(edit, translation))
        .map(bboxes => getHull(bboxes, 10))
    
    return (
        <g>
            {hulls.map(hull => {
                return (
                    <Hull
                        ref={e => {
                            if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                        }}
                        data-test="motivation"
                        key={`${motivation.id}`}
                        id={`${motivation.id}`}
                        data-id={`${motivation.id}}`}
                        hull={hull.hull}
                        fillOpacity={0.5}
                        fill='rgb(244, 123, 123)'
                        onClick={() => {
                            onClick && onClick(motivation)
                        }}
                    />
                )
            })}
        </g>
    );
}

