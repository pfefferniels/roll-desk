import { describe, expect, it } from 'vitest'
import { Belief, mm, Perforator, PerforatorSetting } from 'linked-rolls'
import { perforatorStatements } from './perforatorStatements'

const likely: Belief = { type: 'belief', id: 'belief-likely', certainty: 'likely', reasons: [] }

const perforator = (setting: Partial<PerforatorSetting>, rest: Partial<Perforator> = {}): Perforator => ({
    type: 'Perforator',
    id: 'perforator',
    condition: { type: 'ConditionState', conditionType: 'setting', ...setting },
    ...rest
})

describe('the statements of a perforator', () => {
    it('states each value to three places with what it was taken from, and where its belief is kept', () => {
        const statements = perforatorStatements(perforator({
            punchDiameter: { value: mm(2.609615237857799), unit: 'mm' },
            chainPitch: {
                value: mm(3.0007), unit: 'mm', slot: mm(2.2857), bridge: mm(0.7106), n: 477,
                '@annotation': { id: 'pitch', belief: likely }
            },
            advance: { value: mm(1.027), unit: 'mm', strength: 0.8104, n: 10910 }
        }))

        expect(statements).toEqual([
            { at: ['condition', 'punchDiameter'], statement: 'punch diameter 2.61 mm' },
            {
                at: ['condition', 'chainPitch'],
                statement: 'chain pitch 3.001 mm',
                detail: 'slot 2.286 mm, bridge 0.711 mm, median of 477 pitches'
            },
            {
                at: ['condition', 'advance'],
                statement: 'advance 1.027 mm',
                detail: 'from 10910 slot lengths, strength 0.81 of 1'
            }
        ])
    })

    it('names the drive as the type vocabulary does, before the setting', () => {
        const statements = perforatorStatements(perforator(
            { punchDiameter: { value: mm(2.2), unit: 'mm' } },
            { drive: { id: 'https://w3id.org/reo/type/drive/asynchronous' } }
        ))
        expect(statements.map(({ at, statement }) => [at, statement])).toEqual([
            [['drive'], 'asynchronous drive'],
            [['condition', 'punchDiameter'], 'punch diameter 2.2 mm']
        ])
    })

    it('leaves out what the perforator does not state', () => {
        expect(perforatorStatements(perforator({ chainPitch: { value: mm(2.4283), unit: 'mm' } })))
            .toEqual([{ at: ['condition', 'chainPitch'], statement: 'chain pitch 2.428 mm' }])
        expect(perforatorStatements(perforator({}))).toEqual([])
        expect(perforatorStatements({ type: 'Perforator', id: 'bare' })).toEqual([])
    })

    it('states a strength of nought', () => {
        const [advance] = perforatorStatements(perforator({ advance: { value: mm(0.5), unit: 'mm', strength: 0 } }))
        expect(advance?.detail).toBe('strength 0 of 1')
    })
})
