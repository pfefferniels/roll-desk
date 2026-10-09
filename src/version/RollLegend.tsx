import { Stack, Typography } from "@mui/material"
import { Certainty } from "linked-rolls"
import { ReactNode } from "react"
import { LegendPopover, LegendRow } from "../stemma/Legend"
import { CertaintyIcon } from "../accounts/CertaintyIcon"

const width = 60
const height = 30

/** A sample drawn in a box the size of every other row's. */
const Sample = ({ children }: { children: ReactNode }) => (
    <svg width={width} height={height} className='legend'>
        {children}
    </svg>
)

const certainties: Certainty[] = ['true', 'likely', 'possible', 'unlikely', 'false']

/**
 * What the drawing of a roll means, row by row, with the keys that move
 * along it. It hangs beside the other buttons over the desk, so that the
 * roll is explained where it is read rather than in a text apart from it.
 */
export const RollLegend = () => (
    <LegendPopover label='Legend of the roll'>
        <LegendRow
            symbol={
                <Sample>
                    <rect x={6} y={8} width={30} height={6} fill='black' />
                    <rect x={24} y={18} width={30} height={6} fill='gray' fillOpacity={0.5} />
                </Sample>
            }
            description='Symbols'
            help={`
                Each bar is a perforation read as a note or an expression,
                on the lane of the track it runs over. Black ones are set
                down by the version on the desk, grey ones inherited from
                the versions before it, the fainter the older. Pointed at,
                a symbol names its track and what it means.
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
                green round what it adds, red round what it takes away, an
                arrow from a dotted outline where it moves something. A
                word under the green, such as "fix", names the kind of edit.
            `}
        />

        <LegendRow
            symbol={
                <Stack direction='row' spacing={0.25} sx={{ width, justifyContent: 'center' }}>
                    {certainties.map(certainty => (
                        <CertaintyIcon key={certainty} certainty={certainty} size={12} />
                    ))}
                </Stack>
            }
            description='Truth value'
            help={`
                The mark over an edit, or beside a statement in an account,
                says how certainly it is held: true, likely, possible,
                unlikely or false. The mark opens the reasons it rests on.
            `}
        />

        <LegendRow
            symbol={
                <Sample>
                    <line x1={0} x2={width} y1={20} y2={20} stroke='#9ca3af' strokeWidth={1} />
                    {[4, 16, 28, 40, 52].map(x => (
                        <line key={x} x1={x} x2={x} y1={20} y2={x === 28 ? 27 : 23} stroke='#9ca3af' strokeWidth={1} />
                    ))}
                    <text x={28} y={15} fontSize={9} fill='#9ca3af' textAnchor='middle'>40 cm</text>
                </Sample>
            }
            description='Ruler'
            help={`
                Distance from the start of the roll, measured on the
                reference copy, which every other copy is aligned with.
            `}
        />

        <Typography variant='body2' sx={{ maxWidth: 300, fontSize: 'small', pt: 1 }}>
            <b>Keys.</b> Space plays the version on the desk and stops it. Tab goes
            through the versions in the stemma and Enter opens one. On
            a version’s roll, the arrow keys go from symbol to symbol,
            with Shift from edit to edit, Home and End to the first and
            the last, Page Up and Page Down a view further, and Enter
            selects where they stand; + and − stretch and shrink the
            roll. Escape clears the selection.
        </Typography>
    </LegendPopover>
)
