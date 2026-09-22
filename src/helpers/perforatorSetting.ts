import { Advance, Belief, ChainPitch, PerforatorSetting } from 'linked-rolls'

/** One value a perforator was set to, as a reader is told of it. */
export interface SettingStatement {
    statement: string
    /** What the value was taken from, where the setting says. */
    detail?: string
    belief?: Belief
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

/** The values the setting states, each under the belief it is held with. */
export const settingStatements = ({ punchDiameter, chainPitch, advance }: PerforatorSetting): SettingStatement[] => {
    const stated: (SettingStatement | undefined)[] = [
        punchDiameter && {
            statement: `punch diameter ${millimetres(punchDiameter.value)}`,
            belief: punchDiameter['@annotation']?.belief
        },
        chainPitch && {
            statement: `chain pitch ${millimetres(chainPitch.value)}`,
            detail: pitchDetail(chainPitch),
            belief: chainPitch['@annotation']?.belief
        },
        advance && {
            statement: `advance ${millimetres(advance.value)}`,
            detail: advanceDetail(advance),
            belief: advance['@annotation']?.belief
        }
    ]
    return stated.filter(statement => statement !== undefined)
}
