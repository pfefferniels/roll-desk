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
                                            instructions.map((instruction, i) => {
                                                const x = instruction.date * horizontalStretch

                                                // in particular in the articulationMap there are 
                                                // often multiple instructions per date. Make sure
                                                // that they don't overlap
                                                const internalPosition =
                                                    instructions
                                                        .slice(0, i)
                                                        .filter(prevInstruction => prevInstruction.date === instruction.date)
                                                        .length
                                                const itemsAtDate = instructions.filter(otherInstruction => instruction.date === otherInstruction.date).length

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
                                                        y={getVerticalPosition(currentRow) + internalPosition * (50 / itemsAtDate)}
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

