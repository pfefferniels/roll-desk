import { SmuflSymbol } from "../score/SmuflSymbol";
import { withAnnotation, WithAnnotationProps } from "../annotation/WithAnnotation";
import { Button, Dialog, DialogActions, DialogContent, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { ReactNode, useState } from "react";

interface InstructionProps extends WithAnnotationProps {
    details?: string | Object | ReactNode;
    x: number;
    y: number;
    text: string;
}

const Instruction: React.FC<InstructionProps> = ({ onAnnotation, annotationTarget, details, x, y, text }) => {
    const [showDetails, setShowDetails] = useState(false)

    if (details instanceof Object) {
        details = (
            <Table>
                <TableBody>
                    {Object.entries(details).map(([key, value]) => (
                        <TableRow>
                            <TableCell>{key}</TableCell>
                            <TableCell>{value}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    return (
        <>
            <rect
                className='instruction'
                x={x}
                y={y}
                rx={8}
                ry={8}
                width={90}
                height={30}
                onClick={(e) => {
                    if (onAnnotation && e.shiftKey) {
                        onAnnotation(annotationTarget || 'unknown');
                    }
                    else {
                        setShowDetails(true);
                    }
                }} />
            <text x={x} y={y + 15}>{text}</text>
            <foreignObject>
                <Dialog open={showDetails}>
                    <DialogContent>
                        {details || 'no details'}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowDetails(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </foreignObject>
        </>
    );
};
export const AnnotatableNote = withAnnotation(SmuflSymbol);
export const AnnotatableInstruction = withAnnotation(Instruction);
