import { describe, expect, it } from 'vitest'
import { alignFeatures, Hole, Millimeters, mm, track } from 'linked-rolls'
import { asPercent, canApply, spanning, spanOf } from './AlignToDialog'

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

describe('a factor read as a percentage', () => {
    it('keeps no more digits than were meant', () => {
        expect(asPercent(1.0023)).toBe('100.23 %')
        expect(asPercent(0.99765)).toBe('99.77 %')
    })

    it('reads a copy at the other one\'s scale as a plain hundred', () => {
        expect(asPercent(1)).toBe('100.00 %')
    })
})

describe('how far a set of features reaches', () => {
    const asRead = (x: Millimeters) => x

    it('is from the beginning of the first note to the end of the last', () => {
        expect(spanOf(ascendingNotes(1), asRead)).toEqual({ from: 100, to: 544 })
    })

    it('is measured where the notes are placed, not where they were read', () => {
        expect(spanOf(ascendingNotes(1), x => x * 1.25)).toEqual({ from: 125, to: 680 })
    })

    it('is nowhere at all for a copy carrying no features', () => {
        expect(spanOf([], asRead)).toBeUndefined()
    })
})

describe('spans laid over one another', () => {
    it('are covered from the leftmost to the rightmost', () => {
        expect(spanning([{ from: 100, to: 200 }, { from: 50, to: 120 }]))
            .toEqual({ from: 50, to: 200 })
    })

    it('leave the copies reaching nowhere out of the reckoning', () => {
        expect(spanning([undefined, { from: 50, to: 120 }, undefined]))
            .toEqual({ from: 50, to: 120 })
    })

    it('cover nothing when not one of them is there', () => {
        expect(spanning([undefined, undefined])).toBeUndefined()
        expect(spanning([])).toBeUndefined()
    })
})
