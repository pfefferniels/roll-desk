import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { connectVersions, defaultCollationTolerance, idOf, mm } from 'linked-rolls'
import { fixtureEdition, ids, viewOf } from './editionFixture'
import { keepingTolerance, parseTolerance, toleranceOf } from './collationTolerance'

describe('the tolerance an edition collates with', () => {
    it('is the one the edition names', () => {
        const edition = fixtureEdition()
        edition.creation.collationTolerance = { toleranceStart: mm(2), toleranceEnd: mm(8) }
        expect(toleranceOf(edition)).toEqual({ toleranceStart: 2, toleranceEnd: 8 })
    })

    it('falls back to the library default where the edition names none', () => {
        const edition = fixtureEdition()
        delete edition.creation.collationTolerance
        expect(toleranceOf(edition)).toEqual(defaultCollationTolerance)
    })

    it('falls back to the library default where there is no edition', () => {
        expect(toleranceOf(undefined)).toEqual(defaultCollationTolerance)
    })
})

describe('reading a tolerance from what was typed', () => {
    it('takes a number of millimetres, whole or fractional', () => {
        expect(parseTolerance('3')).toBe(3)
        expect(parseTolerance('0.5')).toBe(0.5)
        expect(parseTolerance('0')).toBe(0)
    })

    it('takes nothing from an empty or half-typed field', () => {
        expect(parseTolerance('')).toBeUndefined()
        expect(parseTolerance('  ')).toBeUndefined()
        expect(parseTolerance('1e')).toBeUndefined()
    })

    it('refuses a negative deviation', () => {
        expect(parseTolerance('-1')).toBeUndefined()
    })
})

describe('collating at a chosen tolerance', () => {
    it('notes the tolerance on the edition within the same step', () => {
        const edition = fixtureEdition()
        const tolerance = { toleranceStart: mm(1), toleranceEnd: mm(3) }
        const connect = connectVersions(viewOf(edition), ids.b, ids.a, tolerance)

        const collated = produce(edition, keepingTolerance(tolerance, connect))
        const version = collated.versions.find(candidate => candidate.id === ids.b)

        expect(collated.creation.collationTolerance).toEqual(tolerance)
        expect(version?.basedOn && idOf(version.basedOn)).toBe(ids.a)
    })
})
