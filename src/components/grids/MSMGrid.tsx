import { StaffLikeGrid } from "../score/Grid";
import { MSM } from "../../lib/Msm";
import { System } from "../score/System";
import { AnnotatableNote } from "../interpolation/Instruction";
import { FC } from "react";

interface MSMGridProps {
    msm: MSM
    horizontalStretch: number
}

export const MSMGrid: FC<MSMGridProps> = ({ msm, horizontalStretch }) => {
    return (
        <System spacing={14} staffSize={7}>
            <StaffLikeGrid clef='G' width={2000} staffSize={7}>
                {(getVerticalPosition: any) => {
                    return (
                        <g>
                            {msm.allNotes.filter(note => note.part === 1).map(note => {
                                const x = note.date * horizontalStretch;
                                return (
                                    <AnnotatableNote
                                        key={`annotatableNote_${note["xml:id"]}`}
                                        name='noteheadBlack'
                                        staffSize={7}
                                        x={x}
                                        y={getVerticalPosition(note["midi.pitch"])} />
                                );
                            })}
                        </g>
                    );
                }}
            </StaffLikeGrid>
            <StaffLikeGrid clef='F' width={2000} staffSize={7}>
                {(getVerticalPosition: any) => {
                    return (
                        <g>
                            {msm.allNotes.filter(note => note.part === 2).map(note => {
                                const x = note.date * horizontalStretch;
                                return (
                                    <AnnotatableNote
                                        key={`annotatableNote_${note["xml:id"]}`}
                                        name='noteheadBlack'
                                        staffSize={7}
                                        x={x}
                                        y={getVerticalPosition(note['midi.pitch'])} />
                                );
                            })}
                        </g>
                    );
                }}
            </StaffLikeGrid>
        </System>
    );
}
