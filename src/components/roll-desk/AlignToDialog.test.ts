import { describe, expect, it } from 'vitest'
import { alignFeatures, Hole, mm, track } from 'linked-rolls'
import { canApply } from './AlignToDialog'

/** Notes on twelve neighbouring tracks of the Welte T-100, one every 40 mm. */
const ascendingNotes = (factor: number): Hole[] =>
    Array.from({ length: 12 }, (_, i) => ({
        type: 'Hole',
        id: `hole-${i}`,
        horizontal: { unit: 'mm', from: mm((100 + i * 40) * factor), to: mm((104 + i * 40) * factor) },
        vertical: { unit: 'track', from: track(11 + i) }
    }))

describe('an alignment that needs only a stretch', () => {
    // A quarter, so that the stretched places stay exact in binary and the
    // shift comes out as a plain zero rather than a rounding of one.
    const alignment = alignFeatures(ascendingNotes(1), ascendingNotes(1.25))

    it('is found, with a shift of exactly zero', () => {
        expect(alignment?.shift).toBe(0)
        expect(alignment?.scale).toBeCloseTo(1.25)
    })

    it('is offered for applying all the same', () => {
        expect(canApply(alignment)).toBe(true)
    })
})

describe('copies that share no run of notes', () => {
    it('leave nothing to apply', () => {
        expect(canApply(alignFeatures(ascendingNotes(1), []))).toBe(false)
    })
})
