import { describe, expect, it } from 'vitest'
import { assignDate, notAfter, notBefore } from 'linked-rolls'
import { dateStatement } from './dateStatement'

const day = (date: Date) => new Intl.DateTimeFormat().format(date)
const first = new Date(1924, 0, 1)
const last = new Date(1932, 11, 31)

describe('what a date states', () => {
    it('gives the day an exact date falls within', () => {
        expect(dateStatement(assignDate(first))).toBe(day(first))
    })

    it('says not before where only the lower bound is known', () => {
        expect(dateStatement(notBefore(first))).toBe(`not before ${day(first)}`)
    })

    it('says not after where only the upper bound is known', () => {
        expect(dateStatement(notAfter(last))).toBe(`not after ${day(last)}`)
    })

    it('names both bounds where both are known', () => {
        expect(dateStatement({ after: first, before: last })).toBe(`${day(first)} to ${day(last)}`)
    })
})
