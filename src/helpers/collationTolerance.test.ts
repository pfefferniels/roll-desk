import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { connectVersions, defaultCollationTolerance, Edition, mm } from 'linked-rolls'
import { fixtureEdition, ids, viewOf } from './editionFixture'
import { derivationToleranceOf, namesAnOffset, parseTolerance, windowAtEnds } from './collationTolerance'

const versionIn = (edition: Edition, versionId: string) =>
    edition.versions.find(version => version.id === versionId)!

describe('the window a derivation was collated in', () => {
    it('is a reach about nothing where the tolerance names no offset', () => {
        expect(windowAtEnds({ toleranceStart: mm(3.5), toleranceEnd: mm(5) }))
            .toEqual({ from: '±3.5 mm', to: '±5 mm' })
    })

    it('names the centre where the window is centred away from zero', () => {
        expect(windowAtEnds({
            toleranceStart: mm(3.5),
            toleranceEnd: mm(5),
            offsetStart: mm(-0.85),
            offsetEnd: mm(-1.46)
        })).toEqual({ from: '-0.85 ±3.5 mm', to: '-1.46 ±5 mm' })
    })

    it('rounds a measured centre to hundredths of a millimetre', () => {
        expect(windowAtEnds({
            toleranceStart: mm(3.5),
            toleranceEnd: mm(5),
            offsetStart: mm(0.7734),
            offsetEnd: mm(2.1005)
        })).toEqual({ from: '0.77 ±3.5 mm', to: '2.1 ±5 mm' })
    })

    it('says whether a centre needs explaining', () => {
        expect(namesAnOffset({ toleranceStart: mm(3.5), toleranceEnd: mm(5) })).toBe(false)
        expect(namesAnOffset({ toleranceStart: mm(3.5), toleranceEnd: mm(5), offsetEnd: mm(-1.46) })).toBe(true)
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
