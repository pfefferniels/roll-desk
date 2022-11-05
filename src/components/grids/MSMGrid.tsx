import { StaffLikeGrid } from "../score/Grid";
import { MSM } from "../../lib/msm";
import { System } from "../score/System";
import { AnnotatableNote } from "../interpolation/Instruction";
import { FC } from "react";
import { calculateBeatLength } from "../../lib/transformers/BeatLengthBasis"

interface MSMGridProps {
    msm: MSM
    horizontalStretch: number
}

export const MSMGrid: FC<MSMGridProps> = ({ msm, horizontalStretch }) => {
    const lastNote = msm.lastNote()
    const maxWidth = ((lastNote?.date || 0) + (lastNote?.duration || 0)) * horizontalStretch

    return (
        <System spacing={14} staffSize={7}>
            <StaffLikeGrid clef='G' width={maxWidth} staffSize={7}>
                {(getVerticalPosition: any) => {
                    const barLength = calculateBeatLength('bar', msm.timeSignature || { numerator: 4, denominator: 4 })
                    return (
                        <g>
                            {msm.allNotes.filter(note => note.part === 1).map(note => {
                                const x = note.date * horizontalStretch;
                                return (
                                    <>
                                        <AnnotatableNote
                                            key={`annotatableNote_${note["xml:id"]}`}
                                            name='noteheadBlack'
                                            staffSize={7}
                                            x={x}
                                            y={getVerticalPosition(note["midi.pitch"])} />
                                        {(note.date % barLength === 0) &&
                                            <>
                                                <text
                                                    className='labelText'
                                                    x={x}
                                                    y={80}>{note.date}</text>
                                                <line
                                                    className='barLine'
                                                    key={`barLine_${note.date}`}
                                                    x1={x}
                                                    y1={0}
                                                    x2={x}
                                                    y2={300}
                                                    stroke='black'
                                                    strokeWidth={1}
                                                    strokeDasharray='4 4' />
                                            </>}
                                    </>
                                );
                            })}
                        </g>
                    );
                }}
            </StaffLikeGrid>
            <StaffLikeGrid clef='F' width={maxWidth} staffSize={7}>
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
