import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { connectVersions, defaultCollationTolerance, Edition, mm } from 'linked-rolls'
import { fixtureEdition, ids, viewOf } from './editionFixture'
import { derivationToleranceOf, parseTolerance } from './collationTolerance'

const versionIn = (edition: Edition, versionId: string) =>
    edition.versions.find(version => version.id === versionId)!

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

describe('the tolerance a version was collated at', () => {
    it('is the one its derivation states', () => {
        const edition = fixtureEdition()
        const tolerance = { toleranceStart: mm(1), toleranceEnd: mm(3) }

        const collated = produce(edition, connectVersions(viewOf(edition), ids.b, ids.a, tolerance))

        expect(derivationToleranceOf(versionIn(collated, ids.b))).toEqual(tolerance)
    })

    it('falls back to the library default where the derivation states none', () => {
        const edition = fixtureEdition()

        expect(derivationToleranceOf(versionIn(edition, ids.b))).toEqual(defaultCollationTolerance)
    })

    it('falls back to the library default where the version derives from nothing', () => {
        const edition = fixtureEdition()

        expect(derivationToleranceOf(versionIn(edition, ids.a))).toEqual(defaultCollationTolerance)
    })
})
