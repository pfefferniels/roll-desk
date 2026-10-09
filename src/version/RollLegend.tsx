import { ReactNode } from "react"
import { LegendPopover, LegendRow } from "../stemma/Legend"

const width = 60
const height = 30

/** A sample drawn in a box the size of every other row's. */
const Sample = ({ children }: { children: ReactNode }) => (
    <svg width={width} height={height} className='legend'>
        {children}
    </svg>
)

/** What is on the desk: a version's roll, or a copy's. */
export type OnTheDesk = 'version' | 'copy'

/**
 * What the drawing on the desk means, row by row, for what is on it: a
 * version's commands and edits, or a copy's features. It hangs beside the
 * other buttons over the desk, so that the roll is explained where it is
 * read rather than in a text apart from it.
 */
export const RollLegend = ({ shows }: { shows: OnTheDesk }) => (
    <LegendPopover label='Legend of the roll'>
        {shows === 'version' ? (
            <>
            <LegendRow
                symbol={
                    <Sample>
                        <rect x={6} y={8} width={30} height={6} fill='black' />
                        <rect x={24} y={18} width={30} height={6} fill='gray' fillOpacity={0.5} />
                    </Sample>
                }
                description='Commands'
                help={`
                    Each bar is a perforation read as a note or an expression,
                    on the lane of the track it runs over. Black ones are set
                    down by the version on the desk, grey ones inherited from
                    the versions before it, the fainter the older. Pointed at,
                    a command names its track and what it means.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <path d='M 6 24 C 20 24, 24 10, 36 14 S 50 22, 54 12' fill='none' stroke='lightblue' strokeWidth={3.2} strokeOpacity={0.7} />
                        <path d='M 6 26 C 20 26, 24 6, 36 10 S 50 20, 54 8' fill='none' stroke='darkblue' strokeWidth={1.6} />
                        <line x1={0} x2={width} y1={4} y2={4} stroke='darkblue' strokeWidth={0.5} />
                        <line x1={0} x2={width} y1={16} y2={16} stroke='darkblue' strokeWidth={0.5} strokeDasharray='4,4' />
                        <line x1={0} x2={width} y1={28} y2={28} stroke='darkblue' strokeWidth={0.5} />
                    </Sample>
                }
                description='Dynamics'
                help={`
                    How loud the emulated piano strikes, the treble above the
                    roll and the bass below it, between the lines for piano,
                    mezzoforte (dashed) and forte. The light blue curve is the
                    version this one derives from, for comparison.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <path d='M 4 15 L 14 15 L 20 5 L 40 5 L 46 15 L 56 15 L 46 15 L 40 25 L 20 25 L 14 15 Z' fill='gray' fillOpacity={0.1} stroke='black' strokeWidth={0.6} />
                    </Sample>
                }
                description='Pedal'
                help={`
                    A band over the keyboard that opens as the pedal goes down
                    and closes as it comes up; the soft pedal is drawn dashed.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <rect x={4} y={7} width={24} height={16} rx={5} fill='#aceebb' stroke='#2f9e44' strokeWidth={1.5} />
                        <rect x={32} y={7} width={24} height={16} rx={5} fill='#fb7f78' stroke='#d64545' strokeWidth={1.5} />
                    </Sample>
                }
                description='Edits'
                help={`
                    What the version changed against the one it derives from:
                    green round what it adds, red round what it takes away. A
                    word under the green, such as "fix", names the kind of edit.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <rect x={4} y={21} width={16} height={5} fill='none' stroke='#666' strokeWidth={0.8} strokeDasharray='2 1.5' />
                        <rect x={40} y={5} width={16} height={5} fill='black' />
                        <path d='M 12 21 C 12 10, 22 7.5, 32 7.5' fill='none' stroke='black' strokeWidth={1.5} />
                        <polygon points='38,7.5 31,4 31,11' fill='black' />
                    </Sample>
                }
                description='Shift'
                help={`
                    An edit that puts something in another place: the arrow
                    leads from where it stood, drawn dotted, to where it is now.
                `}
            />
            </>
        ) : (
            <>
            <LegendRow
                symbol={
                    <Sample>
                        <rect x={6} y={8} width={30} height={6} fill='#444' />
                        <rect x={24} y={18} width={30} height={6} fill='#444' />
                    </Sample>
                }
                description='Perforations'
                help={`
                    The holes measured on this copy, each chain of them drawn
                    as one bar on the track it runs over.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <rect x={8} y={4} width={44} height={22} fill='#444' fillOpacity={0.2} />
                    </Sample>
                }
                description='Patch'
                help={`
                    Paper or tape glued onto the roll: a label, a strip
                    covering perforations, or a patch over a tear.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <rect x={6} y={5} width={48} height={20} rx={9} fill='gray' fillOpacity={0.2} stroke='black' strokeDasharray='4 2' />
                    </Sample>
                }
                description='Modification'
                help={`
                    An act that changed this copy after it was punched, drawn
                    round what it added, took away or made, with its purpose
                    and, where known, who did it.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <line x1={0} x2={width} y1={15} y2={15} stroke='black' strokeDasharray='5 5' />
                    </Sample>
                }
                description='Keyboard division'
                help={`
                    Where the bass half of the keyboard ends and the treble
                    begins, between f sharp and g.
                `}
            />
            </>
        )}
    </LegendPopover>
)
