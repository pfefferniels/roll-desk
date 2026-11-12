import { describe, expect, it } from 'vitest'
import { Alignment, Edition, mm, RollCopy, systemOf, track, welteT100 } from 'linked-rolls'
import { emptyMetadata } from '../edition/EditionContext'
import { hole } from '../edition/editionFixture'
import { alignmentWarnings, liesWell, notesOn, standingAsSentence, standingOf } from './alignmentStanding'

/** A copy of so many notes on the T-100's note positions, and one expression command. */
const copyOf = (id: string, notes: number, alignment?: Alignment): RollCopy => ({
    type: 'RollCopy',
    id,
    siglum: id,
    conditions: [],
    modifications: [],
    measurements: { ...(alignment && { alignment }) },
    production: {
        system: systemOf(welteT100),
        produced: [
            ...Array.from({ length: notes }, (_, i) => hole(`${id}-note-${i}`, 100 + i * 10, 105 + i * 10, 20 + (i % 60))),
            hole(`${id}-pedal`, 90, 92, 93)
        ]
    }
})

const aligned = (matched: number): Alignment => ({
    against: 'St1',
    shift: { horizontal: mm(0), vertical: track(0) },
    scale: 1,
    matched,
    residual: mm(0.64)
})

const editionOf = (...copies: RollCopy[]): Edition => ({ ...emptyMetadata, versions: [], copies })

describe('how a copy lies on the reference copy', () => {
    it('counts the chains the bar reads as notes, and no expression command', () => {
        expect(notesOn(copyOf('St1', 12))).toBe(12)
    })

    it('has nothing to say of the reference copy, or where there is none', () => {
        const first = copyOf('St1', 12)
        expect(standingOf(editionOf(first), first)).toBeUndefined()
        expect(standingOf(editionOf(), first)).toBeUndefined()
    })

    it('says with how many of its notes a copy lies there, and how far apart', () => {
        const second = copyOf('St2', 288, aligned(287))
        const standing = standingOf(editionOf(copyOf('St1', 288), second), second)!

        expect(liesWell(standing)).toBe(true)
        expect(standingAsSentence(standing)).toBe('St2 lies on St1 with 287 of its 288 notes, 0.6 mm apart.')
    })

    it('takes a copy for badly read where the alignment found a fraction of its notes', () => {
        // A copy read off its tracks or on the wrong clock aligns by chance.
        const second = copyOf('St2', 5609, aligned(523))
        const standing = standingOf(editionOf(copyOf('St1', 5600), second), second)!

        expect(liesWell(standing)).toBe(false)
        expect(standingAsSentence(standing)).toMatch(/^St2 lies on St1 with only 523 of its 5609 notes\. Check/)
    })

    it('says where a copy could not be aligned at all', () => {
        const second = copyOf('St2', 288)
        const standing = standingOf(editionOf(copyOf('St1', 288), second), second)!

        expect(liesWell(standing)).toBe(false)
        expect(standingAsSentence(standing)).toMatch(/^St2 could not be aligned with St1/)
    })

    it('takes the alignment a copy is about to be given, where it is not in the edition yet', () => {
        const coming = copyOf('Ph1', 100)
        const standing = standingOf(editionOf(copyOf('St1', 100)), coming, aligned(96))!

        expect(standing.matched).toBe(96)
    })
})

describe('what stands in the way of collating the copies', () => {
    it('names the copies that do not lie on the reference copy, and no others', () => {
        const edition = editionOf(
            copyOf('St1', 288),
            copyOf('St2', 288),
            copyOf('Ph1', 288, aligned(280)),
            copyOf('Be1', 288, aligned(40))
        )

        const warnings = alignmentWarnings(edition)
        expect(warnings).toHaveLength(2)
        expect(warnings[0]).toMatch(/^St2 could not be aligned with St1/)
        expect(warnings[1]).toMatch(/^Be1 lies on St1 with only 40 of its 288 notes/)
    })

    it('finds nothing wrong with copies that lie well, or with a single copy', () => {
        expect(alignmentWarnings(editionOf(copyOf('St1', 288), copyOf('St2', 288, aligned(287))))).toEqual([])
        expect(alignmentWarnings(editionOf(copyOf('St1', 288)))).toEqual([])
    })
})
