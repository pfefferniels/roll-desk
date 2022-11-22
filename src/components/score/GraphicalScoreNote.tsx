import { SmuflSymbol } from "./SmuflSymbol";
import { MeiNote } from "../../lib/mei";
import { withAnnotation, WithAnnotationProps } from "../annotation/WithAnnotation";

interface GraphicalScoreNoteProps extends WithAnnotationProps {
    scoreNote: MeiNote;
    x: number;
    y: number;
    staffSize: number;
    active: boolean;
    missing: boolean; // p.motivation === Motivation.Omission
    onClick: () => void;
}

export const GraphicalScoreNote: React.FC<GraphicalScoreNoteProps> = ({ scoreNote, active, missing, x, y, staffSize, onClick, onAnnotation, annotationTarget }): JSX.Element => {
    return (
        <>
            {scoreNote.accid && scoreNote.accid !== 0 && (
                <SmuflSymbol
                    name={{
                        '-2': 'accidentalDoubleFlat',
                        '-1': 'accidentalFlat',
                        '1': 'accidentalSharp',
                        '2': 'accidentalDoubleSharp'
                    }[scoreNote.accid.toString()] || ''}
                    annotationTarget={`${scoreNote.id}_accidental`}
                    x={x - 10}
                    y={y}
                    staffSize={staffSize} />
            )}
            <SmuflSymbol
                name='noteheadBlack'
                key={`note_${scoreNote.id}`}
                missingNote={missing}
                active={active}
                x={x}
                y={y}
                staffSize={staffSize}
                onClick={(e) => {
                    if (e.shiftKey && onAnnotation) {
                        onAnnotation(annotationTarget || 'unknown target')
                    }
                    else {
                        onClick()
                    }
                }} />
        </>

    );
};

export const AnnotatableScoreNote = withAnnotation(GraphicalScoreNote)
