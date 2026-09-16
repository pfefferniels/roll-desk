import { describe, expect, it } from 'vitest'
import { assignDate, notAfter, notBefore } from 'linked-rolls'
import { daysOf, modeOf, statementIn } from './DateStatementField'

const first = new Date(1924, 0, 1)
const last = new Date(1932, 11, 31)
const held = { '@annotation': { id: 'a', belief: { type: 'belief' as const, id: 'b', certainty: 'likely' as const, reasons: [] } } }

describe('the mode a stated date is in', () => {
    it('reads an exact date as a day', () => {
        expect(modeOf(assignDate(first))).toBe('within')
    })

    it('reads a date bounded from one side', () => {
        expect(modeOf(notBefore(first))).toBe('after')
        expect(modeOf(notAfter(last))).toBe('before')
    })

    it('reads a date bounded from both sides', () => {
        expect(modeOf({ after: first, before: last })).toBe('between')
    })

    it('offers a day where nothing is stated yet', () => {
        expect(modeOf(undefined)).toBe('within')
    })
})

describe('the days a statement is made of', () => {
    it('puts the day of an exact date first', () => {
        expect(daysOf(assignDate(first))).toEqual([first, undefined])
    })

    it('puts a single bound first, whichever side it is', () => {
        expect(daysOf(notBefore(first))).toEqual([first, undefined])
        expect(daysOf(notAfter(last))).toEqual([last, undefined])
    })

    it('keeps both bounds in order', () => {
        expect(daysOf({ after: first, before: last })).toEqual([first, last])
    })
})

describe('the date a mode and its days state', () => {
    it('states nothing while no day is picked', () => {
        expect(statementIn('within', undefined, undefined)).toBeUndefined()
        expect(statementIn('between', undefined, last)).toBeUndefined()
    })

    it('states the day, or the bound the mode asks for', () => {
        expect(statementIn('within', first, undefined)).toEqual(assignDate(first))
        expect(statementIn('after', first, undefined)).toEqual(notBefore(first))
        expect(statementIn('before', last, undefined)).toEqual(notAfter(last))
    })

    it('states both bounds once the second day is picked', () => {
        expect(statementIn('between', first, last)).toEqual({ after: first, before: last })
    })

    /** Half a "between" is still a lower bound, and says so rather than nothing. */
    it('states the lower bound while the second day is missing', () => {
        expect(statementIn('between', first, undefined)).toEqual(notBefore(first))
    })

    it('keeps the belief held about the date it replaces', () => {
        expect(statementIn('after', first, undefined, { ...assignDate(last), ...held }))
            .toEqual({ ...notBefore(first), ...held })
    })
})
