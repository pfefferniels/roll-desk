import { ReactNode } from "react"
import { LegendRow } from "./Legend"
import { alignmentLook, pairLook, problemLook, shadowLook } from "./constraintLooks"

const Glyph = ({ children }: { children: ReactNode }) => (
    <svg width={60} height={30} className='legend'>{children}</svg>
)

/** The rows explaining what the constraint layer draws over a version. */
export const ConstraintLegend = () => (
    <>
        <LegendRow
            symbol={
                <Glyph>
                    <rect x={24} y={3} width={10} height={7} fill='black' />
                    <line x1={24} x2={24} y1={6} y2={24} {...alignmentLook} />
                    <rect x={24} y={20} width={22} height={7} fill='black' />
                </Glyph>
            }
            description='Placement'
            help='The expression is placed by the note at the other end: it takes the onset of a note it follows, and begins before or after one it is ordered against. The line runs from where the expression plays to the onset of the note.'
        />
        <LegendRow
            symbol={
                <Glyph>
                    <path d='M 12 8 L 12 24 L 48 24 L 48 8' {...pairLook} />
                </Glyph>
            }
            description='Pair'
            help='The two keep their measured distance: whatever displaces the one displaces the other.'
        />
        <LegendRow
            symbol={
                <Glyph>
                    <rect x={8} y={9} width={20} height={12} {...shadowLook} />
                    <line x1={8} x2={32} y1={15} y2={15} stroke={shadowLook.stroke} strokeWidth={0.4} />
                    <rect x={32} y={9} width={20} height={12} fill='black' />
                </Glyph>
            }
            description='Measured place'
            help='A perforation is drawn where it plays once its constraints are applied. The dashed outline is where its holes were measured, shown once the shift is visible at the zoom.'
        />
        <LegendRow
            symbol={
                <Glyph>
                    <rect x={20} y={9} width={20} height={12} fill='black' />
                    <rect x={18} y={7} width={24} height={16} {...problemLook} />
                </Glyph>
            }
            description='Constraint problem'
            help='A statement that cannot hold in this version. The list of problems says why.'
        />
    </>
)
