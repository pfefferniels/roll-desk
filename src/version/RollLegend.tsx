import { ReactNode } from "react"
import { LegendPopover, LegendRow } from "../stemma/Legend"

/** A later hand's colour as it comes out on white; on a scan the desk picks one to stand out from the paper. */
const laterHand = '#ee560c'

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
                    Each bar is a command, a note or an expression, on the lane
                    of the track it runs over. A command is carried by the
                    perforations of the copies that bear it, and drawn where
                    they put it. Black ones are
                    set down by the version on the desk, grey ones inherited
                    from the versions before it, the fainter the older. Pointed
                    at, a command names its track and what it means.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <polygon points='4,15 18,9 42,9 56,15 42,21 18,21' fill='black' />
                    </Sample>
                }
                description='Scatter'
                help={`
                    Pointed at, a command shows how far its carriers disagree:
                    it narrows to the stretch all of them cover and tapers out
                    to the earliest onset and the latest end among them. Thin
                    lines from its ends run to the dynamics curve, where the
                    velocity it is struck with is written.
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
                        {[[2, 7, 14], [14, 11, 20], [26, 19, 12], [38, 9, 16], [48, 23, 10]].map(([x, y, w]) => (
                            <rect key={x} x={x} y={y} width={w} height={2} fill='gray' fillOpacity={0.5} />
                        ))}
                        <line x1={0} x2={width} y1={2} y2={2} stroke='dimgray' strokeWidth={0.6} strokeDasharray='4 3' />
                        <line x1={0} x2={width} y1={28} y2={28} stroke='dimgray' strokeWidth={0.6} strokeDasharray='4 3' />
                        {[8, 34].map(x => (
                            <path
                                key={x}
                                d={`M ${x} 15 L ${x + 1} 3 L ${x + 11} 3 Q ${x + 12} 3 ${x + 12} 9 Q ${x + 12} 14 ${x + 14} 15 Q ${x + 12} 16 ${x + 12} 21 Q ${x + 12} 27 ${x + 11} 27 L ${x + 1} 27 Z`}
                                fill='gray'
                                fillOpacity={0.1}
                                stroke='black'
                                strokeWidth={0.6}
                            />
                        ))}
                    </Sample>
                }
                description='Pedal'
                help={`
                    A band over the keyboard that opens as the damper pedal goes
                    down and closes as it comes up; the soft pedal is drawn as a
                    dashed outline.
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
                    word or sign under the green names the shape of the change.
                    Each change is musical or technical, as the cursor says.
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
                        <rect x={8} y={4} width={44} height={22} fill={laterHand} fillOpacity={0.2} />
                    </Sample>
                }
                description='Patch'
                help={`
                    Paper or tape glued onto the roll: a label, a strip
                    covering perforations, or a patch over a tear. It is
                    always put on after the punching, so it is drawn in the
                    colour of a later hand.
                `}
            />

            <LegendRow
                symbol={
                    <Sample>
                        <rect x={14} y={18} width={16} height={3} fill={laterHand} />
                        <rect x={34} y={22} width={14} height={3} fill={laterHand} />
                        <rect x={9} y={14.5} width={44} height={14} rx={4} fill='none' stroke={laterHand} strokeWidth={1.25} strokeDasharray='4 3' />
                        <rect x={9} y={1} width={36} height={11} rx={2} fill='white' stroke={laterHand} />
                        <text x={27} y={9.5} fontSize={8} textAnchor='middle' fill={laterHand}>purpose</text>
                    </Sample>
                }
                description='Modification'
                help={`
                    An act that changed this copy after it was punched. What
                    it brought onto the copy is outlined wherever it lies and
                    tagged with what it was done for, in a colour picked to
                    stand out from the paper of the scan, or from white where
                    no scan is shown. Pointed at anywhere within its outline,
                    it says what it added, the texts it wrote, and who did it
                    and when; a click there opens the reasons for that.
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
