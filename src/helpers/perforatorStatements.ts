import { Advance, ChainPitch, nameOf, Perforator } from 'linked-rolls'

/** One thing the edition states of a perforator, as a reader is told of it. */
export interface PerforatorStatement {
    /** Where the statement stands under the perforator, which is where a belief about it is kept. */
    at: string[]
    statement: string
    /** What the value was taken from, where the setting says. */
    detail?: string
}

// Three places keep apart what the measurements tell apart, 3.001 from 2.999 mm.
const millimetres = (value: number): string => `${Math.round(value * 1000) / 1000} mm`

const listed = (parts: (string | false)[]): string | undefined =>
    parts.filter(part => part !== false).join(', ') || undefined

const pitchDetail = ({ slot, bridge, n }: ChainPitch) => listed([
    slot !== undefined && `slot ${millimetres(slot)}`,
    bridge !== undefined && `bridge ${millimetres(bridge)}`,
    n !== undefined && `median of ${n} pitches`
])

const advanceDetail = ({ strength, n }: Advance) => listed([
    n !== undefined && `from ${n} slot lengths`,
    strength !== undefined && `strength ${Math.round(strength * 100) / 100} of 1`
])

/** The drive and the values of the setting the perforator states. */
export const perforatorStatements = ({ drive, condition }: Perforator): PerforatorStatement[] => {
    const stated: (PerforatorStatement | undefined)[] = [
        drive && {
            at: ['drive'],
            statement: `${nameOf(drive)} drive`
        },
        condition?.punchDiameter && {
            at: ['condition', 'punchDiameter'],
            statement: `punch diameter ${millimetres(condition.punchDiameter.value)}`
        },
        condition?.chainPitch && {
            at: ['condition', 'chainPitch'],
            statement: `chain pitch ${millimetres(condition.chainPitch.value)}`,
            detail: pitchDetail(condition.chainPitch)
        },
        condition?.advance && {
            at: ['condition', 'advance'],
            statement: `advance ${millimetres(condition.advance.value)}`,
            detail: advanceDetail(condition.advance)
        }
    ]
    return stated.filter(statement => statement !== undefined)
}
