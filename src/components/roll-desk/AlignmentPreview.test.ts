import { describe, expect, it } from 'vitest'
import { Hole, Millimeters, mm, scale, track } from 'linked-rolls'
import { spanOf } from './AlignmentPreview'

/** Notes on twelve neighbouring tracks of the Welte T-100, one every 40 mm. */
const ascendingNotes = (factor: number): Hole[] =>
    Array.from({ length: 12 }, (_, i) => ({
        type: 'Hole',
        id: `hole-${i}`,
        horizontal: { unit: 'mm', from: mm((100 + i * 40) * factor), to: mm((104 + i * 40) * factor) },
        vertical: { unit: 'track', from: track(11 + i) }
    }))

describe('how far a set of features reaches', () => {
    const asRead = (x: Millimeters) => x

    it('is from the beginning of the first note to the end of the last', () => {
        expect(spanOf(ascendingNotes(1), asRead)).toEqual({ from: 100, to: 544 })
    })

    it('is measured where the notes are placed, not where they were read', () => {
        expect(spanOf(ascendingNotes(1), x => scale(x, 1.25))).toEqual({ from: 125, to: 680 })
    })

    it('is nowhere at all for a copy carrying no features', () => {
        expect(spanOf([], asRead)).toBeUndefined()
    })
})
