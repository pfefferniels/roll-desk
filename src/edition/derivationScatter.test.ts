import { describe, expect, it } from 'vitest'
import {
    assignReference, CollationTolerance, Edition, HoleChain, mm, normalQuantile, RollCopy, systemOf, toleranceAcross, Version,
    welteT100
} from 'linked-rolls'
import { emptyMetadata } from './EditionContext'
import { hole, note } from './editionFixture'
import { curveAt, derivationScatterOf, extentOf, ticksAcross, windowAt } from './derivationScatter'

const normalSample = (n: number, centre: number, sigma: number): number[] =>
    Array.from({ length: n }, (_, i) => centre + sigma * normalQuantile((i + 0.5) / n))

const copy = (id: string, produced: HoleChain[]): RollCopy => ({
    type: 'RollCopy',
    id,
    measurements: {},
    conditions: [],
    modifications: [],
    keeper: { name: 'Test', sameAs: [] },
    production: { produced }
})

const window: CollationTolerance = { toleranceStart: mm(3.5), toleranceEnd: mm(5), offsetStart: mm(0.4) }

/**
 * A text A the ground copy and the witness both read, the witness
 * putting each note as far from the ground copy as the displacement
 * says, and a text B derived from it that the witness alone reads: it
 * adds a note of its own and strikes the first one, so that the edits
 * name the witness as B's side and the ground copy as A's. B is
 * collated at the window given, or states none where it is null.
 */
const derived = (displacements: readonly number[], tolerance: CollationTolerance | null = window): Edition => {
    const at = (i: number) => 100 * i
    const base: Version = {
        id: 'A',
        system: systemOf(welteT100),
        motivations: [],
        edits: [{
            type: 'edit',
            id: 'edit-a',
            insert: displacements.map((_, i) => ({
                ...note(`note-${i}`, 60, `ground-${i}`),
                carriers: [assignReference(`ground-${i}`), assignReference(`witness-${i}`)]
            }))
        }]
    }
    const child: Version = {
        id: 'B',
        system: systemOf(welteT100),
        motivations: [],
        edits: [{ type: 'edit', id: 'edit-b', insert: [note('own', 61, 'witness-own')], delete: ['note-0'] }],
        basedOn: [{ ...assignReference('A'), ...(tolerance && { collationTolerance: tolerance }) }]
    }

    return {
        ...structuredClone(emptyMetadata),
        copies: [
            copy('ground', displacements.map((_, i) => hole(`ground-${i}`, at(i), at(i) + 10, 47))),
            copy('witness', [
                ...displacements.map((d, i) => hole(`witness-${i}`, at(i) + d, at(i) + 10 + d, 47)),
                hole('witness-own', -50, -40, 48)
            ])
        ],
        versions: [base, child]
    }
}

describe('the scatter of a derivation', () => {
    it('measures the version\'s side against the other, in the direction its window is stated', () => {
        const scatter = derivationScatterOf(derived(normalSample(400, 0.4, 0.9)), 'B')!
        const notes = scatter.samples[0]!

        expect(scatter.copies).toEqual(['witness'])
        expect(notes.scatter.group).toBe('note')
        expect(notes.scatter.spread.from.median).toBeCloseTo(0.4, 2)
        expect(notes.scatter.spread.from.sigma).toBeCloseTo(0.9, 2)
    })

    it('lands a window calculated from it on the side it was measured over', () => {
        const scatter = derivationScatterOf(derived(normalSample(400, 0.4, 0.9)), 'B')!
        const calculated = toleranceAcross(scatter.samples.map(sample => sample.scatter), 'child')!

        expect(calculated.offsetStart).toBeCloseTo(0.4, 2)
    })

    it('draws the window the derivation states', () => {
        expect(derivationScatterOf(derived(normalSample(400, 0.4, 0.9)), 'B')!.window).toEqual(window)
    })

    it('draws the default window where the derivation states none', () => {
        expect(derivationScatterOf(derived(normalSample(400, 0.4, 0.9), null), 'B')!.window)
            .toEqual({ toleranceStart: mm(5), toleranceEnd: mm(5) })
    })

    it('counts the readings the window does not admit, at each end apart', () => {
        // Shifted as a whole, both ends move: 0.4 ± 3.5 at the onset
        // leaves out the one at 4.5, ± 5 at the end admits it.
        const scatter = derivationScatterOf(derived([...normalSample(400, 0.4, 0.9), 4.5]), 'B')!

        expect(scatter.samples[0]!.outside.from).toHaveLength(1)
        expect(scatter.samples[0]!.outside.from[0]).toBeCloseTo(4.5, 6)
        expect(scatter.samples[0]!.outside.to).toEqual([])
        expect(scatter.outside).toBe(1)
    })

    it('is nothing for a version that derives from nothing', () => {
        expect(derivationScatterOf(derived(normalSample(400, 0.4, 0.9)), 'A')).toBeUndefined()
    })

    it('is nothing for a derivation whose edits name no side', () => {
        const edition = derived(normalSample(400, 0.4, 0.9))
        edition.versions[1]!.edits = []

        expect(derivationScatterOf(edition, 'B')).toBeUndefined()
    })
})

describe('the stretch a derivation\'s scatter is drawn across', () => {
    it('takes in every bin and the window at both ends', () => {
        const scatter = derivationScatterOf(derived(normalSample(400, 0.4, 0.9)), 'B')!
        const [low, high] = extentOf(scatter, mm(0))

        // The window at the end, ±5 about nothing, is the widest of all.
        expect(low).toBeCloseTo(-5, 6)
        expect(high).toBeCloseTo(5, 6)
    })

    it('reaches as far as a reading lying outside the window', () => {
        const scatter = derivationScatterOf(derived([...normalSample(400, 0.4, 0.9), 7.1]), 'B')!

        expect(extentOf(scatter, mm(0))[1]).toBeGreaterThanOrEqual(7.1)
    })
})

describe('the window at one end', () => {
    it('is centred on the offset stated for that end, on nothing where none is', () => {
        expect(windowAt(window, 'from')).toEqual({ centre: 0.4, reach: 3.5 })
        expect(windowAt(window, 'to')).toEqual({ centre: 0, reach: 5 })
    })
})

describe('the curve drawn over a histogram', () => {
    it('peaks at the centre with the height its area asks for', () => {
        const curve = { centre: mm(0.4), sigma: mm(1), area: 100 }

        expect(curveAt(curve, 0.4)).toBeCloseTo(100 / Math.sqrt(2 * Math.PI), 6)
        expect(curveAt(curve, 1.4)).toBeCloseTo(curveAt(curve, -0.6), 6)
    })
})

describe('the marks along the axis', () => {
    it('falls on whole millimetres across the stretch', () => {
        expect(ticksAcross([-4.2, 4.7])).toEqual([-4, -2, 0, 2, 4])
    })

    it('stands closer over a narrow stretch and further over a wide one', () => {
        expect(ticksAcross([-2.5, 3])).toEqual([-2, -1, 0, 1, 2, 3])
        expect(ticksAcross([-8.4, 8.4])).toEqual([-5, 0, 5])
    })
})
