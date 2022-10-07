import { SmuflSymbol } from "../score/SmuflSymbol";
import { withAnnotation, WithAnnotationProps } from "../annotation/WithAnnotation";

interface InstructionProps extends WithAnnotationProps {
    onClick?: () => void;
    x: number;
    y: number;
    text: string;
}
const Instruction: React.FC<InstructionProps> = ({ onAnnotation, annotationTarget, onClick, x, y, text }) => {
    return (
        <>
            <rect
                className='instruction'
                x={x}
                y={y}
                width={90}
                height={30}
                onClick={(e) => {
                    if (onAnnotation && e.altKey) {
                        onAnnotation(annotationTarget || 'unknown');
                    }
                    else if (onClick) {
                        onClick();
                    }
                }} />
            <text />
            <text x={x} y={y + 15}>{text}</text>
        </>
    );
};
export const AnnotatableNote = withAnnotation(SmuflSymbol);
export const AnnotatableInstruction = withAnnotation(Instruction);
