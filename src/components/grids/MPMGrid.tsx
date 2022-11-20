import { Dynamics, instructionTypes, MPM, Ornament, Part, Tempo } from "../../lib/mpm";
import { GraphicalLikeGrid } from "../score/Grid";
import { AnnotatableInstruction } from "../interpolation/Instruction";

interface MPMGridProps {
    mpm: MPM;
    horizontalStretch: number;
}

export const MPMGrid: React.FC<MPMGridProps> = ({ mpm, horizontalStretch }) => {
    const rowsCount = mpm.countMaps()
    let currentRow = -rowsCount - 1

    return (
        <GraphicalLikeGrid numberOfRows={rowsCount} width={2000}>
            {(getVerticalPosition: any) => {
                return (
                    <g>
                        {(['global', 0, 1] as Part[]).map((part) => {
                            return instructionTypes.map(type => {
                                const instructions = mpm.getInstructions<any>(type, part)
                                if (!instructions.length)
                                    return null

                                currentRow += 1

                                return (
                                    <g>
                                        <text
                                            x={0}
                                            y={getVerticalPosition(currentRow)}
                                            className='labelText'>{type} ({part})
                                        </text>
                                        {
                                            instructions.map(instruction => {
                                                const x = instruction.date * horizontalStretch
                                                const xmlId = instruction['xml:id']
                                                let label = ''
                                                if (instruction.type === 'ornament')
                                                    label = instruction['name.ref']
                                                else if (instruction.type === 'tempo')
                                                    label = instruction.bpm.toString() + (instruction['transition.to'] ? ` → ${instruction['transition.to']}` : '')
                                                else if (instruction.type === 'dynamics')
                                                    label = instruction.volume.toString()
                                                else if (instruction.type === 'articulation')
                                                    label = instruction.relativeDuration.toString()
                                                else if (instruction.type === 'asynchrony')
                                                    label = instruction['milliseconds.offset'].toString()

                                                return (
                                                    <AnnotatableInstruction
                                                        key={`instruction_${xmlId}`}
                                                        annotationTarget={`interpolation.mpm#${xmlId}`}
                                                        x={x}
                                                        y={getVerticalPosition(currentRow)}
                                                        text={label}
                                                        details={instruction} />
                                                )
                                            })
                                        }
                                    </g>
                                )

                            })
                        })
                        }
                    </g>
                )
            }}
        </GraphicalLikeGrid >
    )
}

