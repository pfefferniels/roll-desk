import { ChainPitch, Drive, DriveId, drives, Measure, Millimeters, mm, Perforator, PerforatorSetting } from 'linked-rolls'

/** A perforator as typed: its drive where one is chosen, and each length as text, so that a half-typed value survives. */
export interface PerforatorInput {
    drive: DriveId | ''
    punchDiameter: string
    chainPitch: string
    slot: string
    bridge: string
    advance: string
}

export type LengthField = Exclude<keyof PerforatorInput, 'drive'>

export const noPerforator: PerforatorInput = { drive: '', punchDiameter: '', chainPitch: '', slot: '', bridge: '', advance: '' }

const asText = (value: number | undefined): string => value === undefined ? '' : String(value)

export const perforatorInputOf = (perforator: Perforator | undefined): PerforatorInput => {
    const setting = perforator?.condition
    return {
        drive: perforator?.drive?.id ?? '',
        punchDiameter: asText(setting?.punchDiameter?.value),
        chainPitch: asText(setting?.chainPitch?.value),
        slot: asText(setting?.chainPitch?.slot),
        bridge: asText(setting?.chainPitch?.bridge),
        advance: asText(setting?.advance?.value)
    }
}

/** The drive of that IRI, or none where the vocabulary has no such drive. */
export const driveIdOf = (value: string): DriveId | '' => drives.find(drive => drive.id === value)?.id ?? ''

/** The length typed, or nothing while no positive number is. */
const lengthOf = (text: string): Millimeters | undefined => {
    const number = parseFloat(text)
    return isNaN(number) || number <= 0 ? undefined : mm(number)
}

const measureOf = (text: string): Measure<'mm'> | undefined => {
    const value = lengthOf(text)
    return value === undefined ? undefined : { value, unit: 'mm' }
}

const chainPitchOf = (input: PerforatorInput): ChainPitch | undefined => {
    const measure = measureOf(input.chainPitch)
    if (!measure) return undefined
    const slot = lengthOf(input.slot)
    const bridge = lengthOf(input.bridge)
    return { ...measure, ...(slot !== undefined && { slot }), ...(bridge !== undefined && { bridge }) }
}

const sameValue = (before: Measure<'mm'>, typed: Measure<'mm'>) => before.value === typed.value

const sameChainPitch = (before: ChainPitch, typed: ChainPitch) =>
    before.value === typed.value && before.slot === typed.slot && before.bridge === typed.bridge

const sameDrive = (before: Drive, typed: Drive) => before.id === typed.id

/**
 * What the input states in place of an earlier statement. One the editor
 * left as it was stays whole, with its belief and what an analysis said
 * of it; a changed value is a new statement, since what was held of the
 * old value does not hold of another.
 */
const restated = <T extends object>(before: T | undefined, typed: T | undefined, same: (before: T, typed: T) => boolean): T | undefined =>
    typed && before && same(before, typed) ? before : typed

/** The setting the input states, keeping the description of it, which is not typed here. */
const settingOf = (input: PerforatorInput, before: PerforatorSetting | undefined): PerforatorSetting | undefined => {
    const description = before?.description
    const punchDiameter = restated(before?.punchDiameter, measureOf(input.punchDiameter), sameValue)
    const chainPitch = restated(before?.chainPitch, chainPitchOf(input), sameChainPitch)
    const advance = restated(before?.advance, measureOf(input.advance), sameValue)
    if (!punchDiameter && !chainPitch && !advance && !description) return undefined

    return {
        conditionType: 'setting',
        ...(description && { description }),
        ...(punchDiameter && { punchDiameter }),
        ...(chainPitch && { chainPitch }),
        ...(advance && { advance })
    }
}

/**
 * The perforator the input states, or none where it states nothing of
 * one. A perforator stated before keeps its id; a new one is given one.
 */
export const perforatorOf = (input: PerforatorInput, before: Perforator | undefined, newId: () => string): Perforator | undefined => {
    const drive = restated(before?.drive, input.drive ? { id: input.drive } : undefined, sameDrive)
    const condition = settingOf(input, before?.condition)
    if (!drive && !condition) return undefined

    return { type: 'Perforator', id: before?.id ?? newId(), ...(drive && { drive }), ...(condition && { condition }) }
}
