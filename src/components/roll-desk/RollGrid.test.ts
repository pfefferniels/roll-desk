import { describe, expect, it } from 'vitest'
import { Hole, mm, Note, pixelsPerInch, px, Resolution, RollCopy, track } from 'linked-rolls'
import { isBand, selectionAsIIIFLink, selectionOf } from './RollGrid'
import { EventDimension } from './RollDesk'

const corner = (x: number, position: number) => ({ x: mm(x), track: track(position) })

const span: EventDimension = {
    horizontal: { from: mm(10), to: mm(40), unit: 'mm' },
    vertical: { from: track(5), to: track(12), unit: 'track' }
}

const copyScannedAt = (resolution?: Resolution): RollCopy => ({
    type: 'RollCopy',
    id: 'copy',
    ops: [],
    conditions: [],
    modifications: [],
    keeper: { name: 'Stanford', sameAs: [] },
    features: [],
    scan: 'roll',
    measurements: {
        trackCalibration: { unit: 'px', offset: px(2000), separation: px(25), shift: track(0) },
        ...(resolution && { scanResolution: { value: resolution, unit: 'px/in' } })
    }
})

describe('what a rubber band encloses', () => {
    it('selects nothing while it still sits on its corner', () => {
        expect(selectionOf({ from: corner(10, 5), to: corner(10, 5) })).toBeUndefined()
    })

    it('reads the same whichever way round it was drawn', () => {
        const forwards = selectionOf({ from: corner(10, 5), to: corner(40, 12) })

        expect(forwards).toEqual(selectionOf({ from: corner(40, 12), to: corner(10, 5) }))
        expect(forwards).toEqual({
            horizontal: { from: mm(10), to: mm(40), unit: 'mm' },
            vertical: { from: track(5), to: track(12), unit: 'track' }
        })
    })

    it('keeps a band that only moved across the roll', () => {
        expect(selectionOf({ from: corner(10, 5), to: corner(10, 8) })).toMatchObject({
            horizontal: { from: mm(10), to: mm(10) },
            vertical: { from: track(5), to: track(8) }
        })
    })
})

describe('the band among the selected items', () => {
    it('is a span standing for nothing else', () => {
        expect(isBand({ ...span, id: 'band' })).toBe(true)
    })

    it('is not a feature, which carries a span of its own', () => {
        const hole: Hole = { ...span, id: 'hole', type: 'Hole' }

        expect(isBand(hole)).toBe(false)
    })

    it('is not a symbol, which carries no span at all', () => {
        const note: Note = { id: 'note', type: 'note', pitch: 60, carriers: [] }

        expect(isBand(note)).toBe(false)
    })
})

describe('the crop a selection is taken as', () => {
    it('takes the roll-wise edges at the resolution the copy states', () => {
        expect(selectionAsIIIFLink(span, copyScannedAt(pixelsPerInch(600))))
            .toBe('roll/2112,236,200,708/full/0/default.jpg')
    })

    it('takes them at the assumed resolution for a copy that states none', () => {
        expect(selectionAsIIIFLink(span, copyScannedAt()))
            .toBe('roll/2112,118,200,354/full/0/default.jpg')
    })

    it('has nothing to crop for a copy whose scan cannot be drawn', () => {
        expect(selectionAsIIIFLink(span, { ...copyScannedAt(), measurements: {} })).toBeUndefined()
    })
})
