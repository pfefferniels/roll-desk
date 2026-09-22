import { describe, expect, it } from 'vitest'
import { Belief, mm, PerforatorSetting } from 'linked-rolls'
import { settingStatements } from './perforatorSetting'

const likely: Belief = { type: 'belief', id: 'belief-likely', certainty: 'likely', reasons: [] }

const setting = (values: Partial<PerforatorSetting>): PerforatorSetting => ({
    type: 'ConditionState',
    conditionType: 'setting',
    ...values
})

describe('the statements of a perforator setting', () => {
    it('states each value to three places with what it was taken from and its belief', () => {
        const statements = settingStatements(setting({
            punchDiameter: { value: mm(2.609615237857799), unit: 'mm' },
            chainPitch: {
                value: mm(3.0007), unit: 'mm', slot: mm(2.2857), bridge: mm(0.7106), n: 477,
                '@annotation': { id: 'pitch', belief: likely }
            },
            advance: {
                value: mm(1.027), unit: 'mm', strength: 0.8104, n: 10910,
                '@annotation': { id: 'advance', belief: likely }
            }
        }))

        expect(statements).toEqual([
            { statement: 'punch diameter 2.61 mm' },
            {
                statement: 'chain pitch 3.001 mm',
                detail: 'slot 2.286 mm, bridge 0.711 mm, median of 477 pitches',
                belief: likely
            },
            {
                statement: 'advance 1.027 mm',
                detail: 'from 10910 slot lengths, strength 0.81 of 1',
                belief: likely
            }
        ])
    })

    it('leaves out what the setting does not state', () => {
        expect(settingStatements(setting({ chainPitch: { value: mm(2.4283), unit: 'mm' } })))
            .toEqual([{ statement: 'chain pitch 2.428 mm' }])
        expect(settingStatements(setting({}))).toEqual([])
    })

    it('states a strength of nought', () => {
        const [advance] = settingStatements(setting({ advance: { value: mm(0.5), unit: 'mm', strength: 0 } }))
        expect(advance?.detail).toBe('strength 0 of 1')
    })
})
