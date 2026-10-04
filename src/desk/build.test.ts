import { describe, expect, it } from 'vitest'
import { buildLine, sourceOf } from './build'

const commit = 'c969453509c423393ec670a0b2783e23e9f0a35a'

describe('a build of the desk', () => {
    it('is named by the short hash and the day of its commit', () => {
        expect(buildLine({ commit, date: '2026-10-02T22:32:48+00:00' }))
            .toBe('c969453 of 2 October 2026')
    })

    it('takes the day in UTC, wherever the commit was made', () => {
        expect(buildLine({ commit, date: '2026-10-03T01:00:00+02:00' }))
            .toBe('c969453 of 2 October 2026')
    })

    it('points to its source at that commit', () => {
        expect(sourceOf({ commit, date: '2026-10-02T22:32:48+00:00' }))
            .toBe(`https://github.com/pfefferniels/roll-desk/tree/${commit}`)
    })
})
