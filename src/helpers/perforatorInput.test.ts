import { describe, expect, it } from 'vitest'
import { Belief, DriveId, mm, Perforator } from 'linked-rolls'
import { driveIdOf, noPerforator, perforatorInputOf, perforatorOf } from './perforatorInput'

const asynchronous: DriveId = 'https://w3id.org/reo/type/drive/asynchronous'
const ramHead: DriveId = 'https://w3id.org/reo/type/drive/ram-head'

const likely: Belief = { type: 'belief', id: 'belief-likely', certainty: 'likely', reasons: [] }
const held = { '@annotation': { id: 'annotation', belief: likely } }

/** A perforator as the survey states one: every value believed, and what the analysis said of it. */
const surveyed = (): Perforator => ({
    type: 'Perforator',
    id: 'perforator_first',
    drive: { id: asynchronous, ...held },
    condition: {
        type: 'ConditionState',
        conditionType: 'setting',
        description: 'read off the IIIF images',
        punchDiameter: { value: mm(2.609615237857799), unit: 'mm', ...held },
        chainPitch: { value: mm(3.0007), unit: 'mm', slot: mm(2.2857), bridge: mm(0.7106), n: 477, ...held },
        advance: { value: mm(1.027), unit: 'mm', strength: 0.8104, n: 10910, ...held }
    }
})

const noId = () => { throw new Error('a perforator stated before keeps its id') }

describe('editing the perforator a copy was punched on', () => {
    it('gives back what was stated, beliefs and analyses and all, where nothing was changed', () => {
        const before = surveyed()
        const after = perforatorOf(perforatorInputOf(before), before, noId)
        expect(after).toEqual(before)
        expect(after?.condition?.chainPitch).toBe(before.condition?.chainPitch)
    })

    it('states a changed value anew, without the belief held of the old one', () => {
        const before = surveyed()
        const after = perforatorOf({ ...perforatorInputOf(before), chainPitch: '3.01', advance: '0.5' }, before, noId)
        expect(after?.condition?.chainPitch).toEqual({ value: 3.01, unit: 'mm', slot: 2.2857, bridge: 0.7106 })
        expect(after?.condition?.advance).toEqual({ value: 0.5, unit: 'mm' })
        expect(after?.condition?.punchDiameter).toBe(before.condition?.punchDiameter)
    })

    it('states another drive anew, and none where the choice is cleared', () => {
        const before = surveyed()
        expect(perforatorOf({ ...perforatorInputOf(before), drive: ramHead }, before, noId)?.drive).toEqual({ id: ramHead })
        expect(perforatorOf({ ...perforatorInputOf(before), drive: '' }, before, noId)).not.toHaveProperty('drive')
    })

    it('keeps the description of a setting whose values are all cleared', () => {
        const before = surveyed()
        const after = perforatorOf({ ...noPerforator }, before, noId)
        expect(after).toEqual({
            type: 'Perforator',
            id: 'perforator_first',
            condition: { type: 'ConditionState', conditionType: 'setting', description: 'read off the IIIF images' }
        })
    })

    it('states no perforator where nothing is typed, and a new one with an id of its own where something is', () => {
        expect(perforatorOf(noPerforator, undefined, () => 'perforator_new')).toBeUndefined()
        expect(perforatorOf({ ...noPerforator, drive: ramHead, punchDiameter: '2.2' }, undefined, () => 'perforator_new')).toEqual({
            type: 'Perforator',
            id: 'perforator_new',
            drive: { id: ramHead },
            condition: { type: 'ConditionState', conditionType: 'setting', punchDiameter: { value: 2.2, unit: 'mm' } }
        })
    })

    it('reads no length from text that states no positive number, and a slot only beside a pitch', () => {
        const typed = { ...noPerforator, punchDiameter: '0', advance: 'about half', slot: '2.2' }
        expect(perforatorOf(typed, undefined, () => 'perforator_new')).toBeUndefined()
    })

    it('knows only the drives the vocabulary declares', () => {
        expect(driveIdOf(asynchronous)).toBe(asynchronous)
        expect(driveIdOf('https://w3id.org/reo/type/staggering')).toBe('')
    })
})
