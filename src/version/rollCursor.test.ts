import { describe, expect, it } from 'vitest'
import { mm } from 'linked-rolls'
import { editWords, inRollOrder, stepIn, Stop, symbolWords } from './rollCursor'

const stop = (id: string, from: number, y = 0): Stop => ({ id, from: mm(from), y })

/** A chord at 10 mm drawn from the bottom up, a note before it and one after. */
const stops = inRollOrder([stop('after', 30), stop('low', 10, 50), stop('high', 10, 20), stop('before', 5)])
const shown = { from: mm(0), to: mm(20) }
const ids = (found: Stop | undefined) => found?.id

describe('the order the cursor takes', () => {
    it('runs along the roll, and through a chord from the top down', () => {
        expect(stops.map(s => s.id)).toEqual(['before', 'high', 'low', 'after'])
    })
})

describe('where a step takes the cursor', () => {
    it('starts at the first stop the view shows', () => {
        expect(ids(stepIn(stops, 'next', undefined, { from: mm(8), to: mm(28) }))).toBe('high')
        expect(ids(stepIn(stops, 'previous', undefined, { from: mm(8), to: mm(28) }))).toBe('high')
    })

    it('starts at the last stop where the view shows the roll beyond all of them', () => {
        expect(ids(stepIn(stops, 'next', undefined, { from: mm(40), to: mm(60) }))).toBe('after')
    })

    it('goes to the stop after or before the one it stands on', () => {
        expect(ids(stepIn(stops, 'next', { id: 'high', at: mm(10) }, shown))).toBe('low')
        expect(ids(stepIn(stops, 'previous', { id: 'high', at: mm(10) }, shown))).toBe('before')
    })

    it('goes nowhere beyond either end', () => {
        expect(stepIn(stops, 'next', { id: 'after', at: mm(30) }, shown)).toBeUndefined()
        expect(stepIn(stops, 'previous', { id: 'before', at: mm(5) }, shown)).toBeUndefined()
    })

    it('goes from a stop of another kind to the first one from its place, or the last one before', () => {
        const onAnEdit = { id: 'edit', at: mm(10) }

        expect(ids(stepIn(stops, 'next', onAnEdit, shown))).toBe('high')
        expect(ids(stepIn(stops, 'previous', onAnEdit, shown))).toBe('before')
    })

    it('goes as far again as the view is wide by the page', () => {
        expect(ids(stepIn(stops, 'pageNext', { id: 'before', at: mm(5) }, shown))).toBe('after')
        expect(ids(stepIn(stops, 'pagePrevious', { id: 'after', at: mm(30) }, shown))).toBe('low')
    })

    it('goes to the first and the last stop', () => {
        expect(ids(stepIn(stops, 'first', { id: 'low', at: mm(10) }, shown))).toBe('before')
        expect(ids(stepIn(stops, 'last', undefined, shown))).toBe('after')
    })

    it('finds nothing on a roll with nothing to stop at', () => {
        expect(stepIn([], 'next', undefined, shown)).toBeUndefined()
    })
})

describe('what the cursor says of a symbol', () => {
    const note = { meaning: 'E5', track: 47, from: mm(1203), to: mm(1207.2), inserted: false }

    it('names the lane and the place in centimetres, and the length in millimetres', () => {
        expect(symbolWords(note)).toBe('E5, track 47, at 120.3 cm, 4.2 mm long')
    })

    it('says how far its copies disagree, where they do', () => {
        expect(symbolWords({ ...note, spread: mm(1.4) })).toContain('onsets 1.4 mm apart')
        expect(symbolWords({ ...note, spread: mm(0) })).not.toContain('apart')
    })

    it('says that this version inserted it', () => {
        expect(symbolWords({ ...note, inserted: true })).toContain('inserted by this version')
    })

    it('gives the velocity, and the one the version it derives from strikes it with', () => {
        expect(symbolWords({ ...note, velocity: { own: 64.24, before: { siglum: 'R2', velocity: 60.1 } } }))
            .toContain('velocity 64.2 (R2: 60.1)')
        expect(symbolWords({ ...note, velocity: { own: 64.24 } })).toMatch(/velocity 64\.2$/)
    })
})

describe('what the cursor says of an edit', () => {
    it('says where it lies, what it does and why', () => {
        expect(editWords({ from: mm(1203), inserted: 2, deleted: 0, motivation: 'Bereinigung' }))
            .toBe('Edit at 120.3 cm, inserts 2 symbols. Bereinigung')
    })

    it('counts what it inserts and deletes, and names its type and certainty', () => {
        expect(editWords({ from: mm(50), type: 'shift', inserted: 1, deleted: 1, certainty: 'likely' }))
            .toBe('Edit at 5.0 cm, shift, inserts 1 symbol, deletes 1, held likely')
        expect(editWords({ from: mm(50), inserted: 0, deleted: 3 })).toBe('Edit at 5.0 cm, deletes 3 symbols')
    })
})
