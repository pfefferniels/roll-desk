import { Dynamics, MPM, Ornament, Part, Tempo } from "../../lib/mpm";
import { GraphicalLikeGrid } from "../score/Grid";
import { AnnotatableInstruction } from "../interpolation/Instruction";

interface MPMGridProps {
    mpm: MPM;
    horizontalStretch: number;
}

export const MPMGrid: React.FC<MPMGridProps> = ({ mpm, horizontalStretch }) => {
    return (
        <GraphicalLikeGrid numberOfRows={9} width={2000}>
            {(getVerticalPosition: any) => {
                return (
                    <g>
                        {(['global', 0, 1] as Part[]).map((part, i) => (
                            <>
                                <text
                                    x={0}
                                    y={getVerticalPosition(i * 3 + 0) - 5}
                                    className='labelText'>Ornamentation ({part})</text>
                                {mpm.getInstructions<Ornament>('ornament', part).map(ornament => {
                                    const x = ornament.date * horizontalStretch;
                                    return (
                                        <AnnotatableInstruction
                                            key={`instruction_${ornament["xml:id"]}`}
                                            annotationTarget={`interpolation.mpm#${ornament["xml:id"]}`}
                                            x={x}
                                            y={getVerticalPosition(i * 3 + 0)}
                                            text={ornament['name.ref']}
                                            details={ornament} />
                                    );
                                })}

                                <text
                                    x={0}
                                    y={getVerticalPosition(i * 3 + 1) -5}
                                    className='labelText'>Tempo ({part})</text>
                                {mpm.getInstructions<Tempo>('tempo', part).map(tempo => {
                                    const x = tempo.date * horizontalStretch;
                                    return (
                                        <AnnotatableInstruction
                                            key={`instruction_${tempo["xml:id"]}`}
                                            annotationTarget={`interpolation.mpm#${tempo["xml:id"]}`}
                                            x={x}
                                            y={getVerticalPosition(i * 3 + 1)}
                                            text={tempo.bpm.toString() + (tempo['transition.to'] ? ` → ${tempo['transition.to']}` : '')}
                                            details={tempo}
                                        />
                                    );
                                })}

                                <text
                                    x={0}
                                    y={getVerticalPosition(i * 3 + 2) - 5}
                                    className='labelText'>Dynamics ({part})</text>
                                {mpm.getInstructions<Dynamics>('dynamics', part).map(dynamics => {
                                    const x = dynamics.date * horizontalStretch;
                                    return (
                                        <AnnotatableInstruction
                                            key={`instruction_${dynamics["xml:id"]}}`}
                                            annotationTarget={`interpolation.mpm#${dynamics["xml:id"]}`}
                                            x={x}
                                            y={getVerticalPosition(i * 3 + 2)}
                                            text={dynamics.volume.toString()}
                                            details={dynamics} />
                                    );
                                })}
                            </>
                        ))}
                    </g>
                );
            }}
        </GraphicalLikeGrid>
    )
}

