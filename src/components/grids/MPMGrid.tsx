import { Dynamics, MPM, Ornament, Tempo } from "../../lib/Mpm";
import { GraphicalLikeGrid } from "../score/Grid";
import { AnnotatableInstruction } from "../interpolation/Instruction";

interface MPMGridProps {
    mpm: MPM;
    horizontalStretch: number;
}

export const MPMGrid: React.FC<MPMGridProps> = ({ mpm, horizontalStretch }) => {
    return (
        <GraphicalLikeGrid numberOfRows={5} width={2000}>
            {(getVerticalPosition: any) => {
                return (
                    <g>
                        {mpm.getInstructions<Ornament>('ornament', 'global').map(ornament => {
                            const x = ornament.date * horizontalStretch;
                            return (
                                <AnnotatableInstruction
                                    key={`instruction_${ornament["xml:id"]}`}
                                    annotationTarget={`interpolation.mpm#${ornament["xml:id"]}`}
                                    x={x}
                                    y={getVerticalPosition(1)}
                                    text={ornament['name.ref']} />
                            );
                        })}

                        {mpm.getInstructions<Tempo>('tempo', 'global').map(tempo => {
                            const x = tempo.date * horizontalStretch;
                            return (
                                <AnnotatableInstruction
                                    key={`instruction_${tempo["xml:id"]}`}
                                    annotationTarget={`interpolation.mpm#${tempo["xml:id"]}`}
                                    x={x}
                                    y={getVerticalPosition(2)}
                                    text={tempo.bpm.toString()} 
                                    details={`transition to: ${tempo["transition.to"]}`}/>
                            );
                        })}

                        {mpm.getInstructions<Dynamics>('dynamics', 'global').map(dynamics => {
                            const x = dynamics.date * horizontalStretch;
                            return (
                                <AnnotatableInstruction
                                    key={`instruction_${dynamics["xml:id"]}}`}
                                    annotationTarget={`interpolation.mpm#${dynamics["xml:id"]}`}
                                    x={x}
                                    y={getVerticalPosition(3)}
                                    text={dynamics.volume.toString()} />
                            );
                        })}

                        {mpm.getInstructions<Dynamics>('dynamics', 0).map(dynamics => {
                            const x = dynamics.date * horizontalStretch;
                            return (
                                <AnnotatableInstruction
                                    key={`instruction_${dynamics["xml:id"]}}`}
                                    annotationTarget={`interpolation.mpm#${dynamics["xml:id"]}`}
                                    x={x}
                                    y={getVerticalPosition(4)}
                                    text={dynamics.volume.toString()} />
                            );
                        })}

                        {mpm.getInstructions<Dynamics>('dynamics', 1).map(dynamics => {
                            const x = dynamics.date * horizontalStretch;
                            return (
                                <AnnotatableInstruction
                                    key={`instruction_${dynamics["xml:id"]}}`}
                                    annotationTarget={`interpolation.mpm#${dynamics["xml:id"]}`}
                                    x={x}
                                    y={getVerticalPosition(5)}
                                    text={dynamics.volume.toString()} />
                            );
                        })}
                    </g>
                );
            }}
        </GraphicalLikeGrid>
    )
}

