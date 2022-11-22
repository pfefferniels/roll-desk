import { SmuflSymbol } from "./SmuflSymbol";
import { MeiNote } from "../../lib/mei";
import { withAnnotation, WithAnnotationProps } from "../annotation/WithAnnotation";
import { MsmNote } from "../../lib/msm";

interface GraphicalScoreNoteProps extends WithAnnotationProps {
    scoreNote: MeiNote | MsmNote;
    x: number;
    y: number;
    staffSize: number;
    active?: boolean;
    missing?: boolean; // p.motivation === Motivation.Omission
    onClick?: () => void;
}

export const GraphicalScoreNote: React.FC<GraphicalScoreNoteProps> = ({ scoreNote, active, missing, x, y, staffSize, onClick, onAnnotation, annotationTarget }): JSX.Element => {
    let accid = 0
    if ('accid' in scoreNote) accid = scoreNote.accid!
    else if ('accidentals' in scoreNote) accid = scoreNote.accidentals

    let id = ''
    if ('id' in scoreNote) id = scoreNote.id 
    else if ('xml:id' in scoreNote) id = scoreNote['xml:id']

    return (
        <>
            {accid !== 0 && (
                <SmuflSymbol
                    name={{
                        '-2': 'accidentalDoubleFlat',
                        '-1': 'accidentalFlat',
                        '1': 'accidentalSharp',
                        '2': 'accidentalDoubleSharp'
                    }[accid.toString()] || ''}
                    annotationTarget={`${id}_accidental`}
                    x={x - 10}
                    y={y}
                    staffSize={staffSize} />
            )}
            <SmuflSymbol
                name='noteheadBlack'
                key={`note_${id}`}
                annotationTarget={id}
                missingNote={missing}
                active={active}
                x={x}
                y={y}
                staffSize={staffSize}
                onClick={(e) => {
                    if (e.shiftKey && onAnnotation) {
                        onAnnotation(annotationTarget || 'unknown target')
                    }
                    else if (onClick) {
                        onClick()
                    }
                }} />
        </>

    );
};

export const AnnotatableScoreNote = withAnnotation(GraphicalScoreNote)
