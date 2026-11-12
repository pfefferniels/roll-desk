import { describe, expect, it } from 'vitest'
import { write } from 'midifile-ts'
import { featuresOf, mm, RollCopy, seconds, systemOf, welteT100 } from 'linked-rolls'
import { addingCopy, isRollFile, placeOnPaper, readEroll, suggestedPlacement } from './RollCopyDialog'
import { emptyEdition } from '../edition/EditionContext'
import { editionReducer, editionState } from '../edition/editionReducer'
import { hole } from '../edition/editionFixture'

const named = (name: string) => new File([], name)

describe('the files the dialog reads a roll from', () => {
    it('takes an analysis, a Spencer e-roll and a Phillips e-roll', () => {
        expect(isRollFile(named('mf320jq4997_analysis.txt'))).toBe(true)
        expect(isRollFile(named('W225E.bar'))).toBe(true)
        expect(isRollFile(named('Traumerei (Schumann) Grunfeld LW e.mid'))).toBe(true)
    })

    it('leaves the settings file beside a Spencer e-roll to the speed it suggests', () => {
        expect(isRollFile(named('W225E.ann'))).toBe(false)
    })
})

describe('putting the time of a roll reader back onto the paper', () => {
    it('runs the paper Gottschewski’s 1.45 m in his half minute', () => {
        expect(placeOnPaper(seconds(30))).toBeCloseTo(1450, -1)
    })

    it('starts at the beginning of the roll', () => {
        expect(placeOnPaper(seconds(0))).toBe(0)
    })

    it('accelerates, the take-up spool filling as the roll runs', () => {
        const first = placeOnPaper(seconds(60))
        const second = placeOnPaper(seconds(120)) - first
        expect(second).toBeGreaterThan(first)
    })
})

/** An e-roll of a hundred notes over four minutes, each a quarter of a second long, at 120 beats a minute. */
const eroll = (): ArrayBuffer => {
    const ticksPerBeat = 480
    const ticksPerSecond = ticksPerBeat * 2
    // Pitches in no order, so that runs of them occur once.
    const pitches = Array.from({ length: 100 }, (_, i) => 36 + ((i * 37 + (i >> 3) * 11) % 48))
    const events = pitches.flatMap((pitch, i) => {
        const gap = i === 0 ? 0 : Math.round(2.15 * ticksPerSecond)
        return [
            { deltaTime: gap, type: 'channel' as const, subtype: 'noteOn' as const, channel: 0, noteNumber: pitch, velocity: 64 },
            { deltaTime: Math.round(0.25 * ticksPerSecond), type: 'channel' as const, subtype: 'noteOff' as const, channel: 0, noteNumber: pitch, velocity: 0 }
        ]
    })
    const bytes = write([[...events, { deltaTime: 0, type: 'meta' as const, subtype: 'endOfTrack' as const }]], ticksPerBeat)
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const editionWith = (reference: RollCopy) => ({ ...emptyEdition(), copies: [reference] })

describe('putting an e-roll onto the paper', () => {
    it('lays the same file out evenly at one speed, and bent on the spool', () => {
        // Where the note a third of the way through the file lies between the first and the last.
        const third = (copy: RollCopy) => {
            const onsets = featuresOf(copy).map(feature => feature.horizontal.from).sort((a, b) => a - b)
            return (onsets[33]! - onsets[0]!) / (onsets[99]! - onsets[0]!)
        }

        expect(third(readEroll(eroll(), welteT100, 'constant'))).toBeCloseTo(1 / 3, 3)
        // The spool has taken up less paper by then than it will in any later third.
        expect(third(readEroll(eroll(), welteT100, 'spool'))).toBeLessThan(0.33)
    })

    it('keeps who read it for an e-roll from a roll reader', () => {
        expect(readEroll(eroll(), welteT100, 'spool').readFrom?.kind).toBeDefined()
    })

    /**
     * The e-rolls of the Hochschule der Künste Bern are written from a
     * scan. Read on the spool, WM 1462 found 784 of its 5449 notes on
     * Stanford's copy; at one speed, 5448.
     */
    it('suggests the way that finds more of the file on the reference copy', () => {
        const scanned = editionWith(readEroll(eroll(), welteT100, 'constant'))
        const played = editionWith(readEroll(eroll(), welteT100, 'spool'))

        const fromScan = suggestedPlacement(eroll(), welteT100, scanned)!
        expect(fromScan.placement).toBe('constant')
        expect(fromScan.matched.constant).toBe(100)
        expect(fromScan.matched.spool).toBeLessThan(100)

        expect(suggestedPlacement(eroll(), welteT100, played)?.placement).toBe('spool')
    })

    it('suggests nothing where there is no copy to try the file against', () => {
        expect(suggestedPlacement(eroll(), welteT100, emptyEdition())).toBeUndefined()
    })
})

describe('adding a copy read from a file', () => {
    const scanned = (id: string): RollCopy => ({
        type: 'RollCopy',
        id,
        conditions: [],
        modifications: [],
        measurements: {},
        production: {
            system: systemOf(welteT100),
            produced: Array.from({ length: 40 }, (_, i) => hole(`${id}-${i}`, 100 + i * 12, 104 + i * 12, 20 + ((i * 7) % 50)))
        }
    })

    /**
     * React's strict mode calls the reducer twice for one dispatch. What
     * the first call puts into the edition is frozen there, and the desk
     * in development went blank on the first upload: "Cannot assign to
     * read only property 'siglum'".
     */
    it('can be run twice for one dispatch, as the reducer is in strict mode', () => {
        const state = editionState(emptyEdition())
        const action = { type: 'apply' as const, op: addingCopy(scanned('first'), 'St1') }

        const once = editionReducer(state, action)
        const twice = editionReducer(state, action)

        expect(twice.edition?.copies.map(copy => copy.siglum)).toEqual(['St1'])
        expect(twice.edition?.copies).toEqual(once.edition?.copies)
    })

    it('names the second copy and aligns it, both times', () => {
        const first = editionReducer(editionState(emptyEdition()), { type: 'apply', op: addingCopy(scanned('first'), 'St1') })
        const shifted = scanned('second')
        shifted.production!.produced = shifted.production!.produced!.map(feature =>
            ({ ...feature, horizontal: { ...feature.horizontal, from: mm(feature.horizontal.from + 30), to: mm(feature.horizontal.to + 30) } }))
        const action = { type: 'apply' as const, op: addingCopy(shifted, 'St2') }

        editionReducer(first, action)
        const second = editionReducer(first, action).edition!.copies[1]!

        expect(second.siglum).toBe('St2')
        expect(second.measurements.alignment?.matched).toBe(40)
        expect(second.measurements.alignment?.shift.horizontal).toBeCloseTo(-30, 3)
    })
})
