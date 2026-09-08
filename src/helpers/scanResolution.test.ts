import { describe, expect, it } from 'vitest'
import { mm, pixelsPerInch, px, RollCopy } from 'linked-rolls'
import { inScan, onPaper } from './scanResolution'

const copyMeasured = (measurements: RollCopy['measurements']): RollCopy => ({
    type: 'RollCopy',
    id: 'copy',
    ops: [],
    conditions: [],
    modifications: [],
    keeper: { name: 'Stanford', sameAs: [] },
    features: [],
    scan: 'https://example.org/iiif/roll',
    measurements
})

const scannedAt = (dpi: number) =>
    copyMeasured({ scanResolution: { value: pixelsPerInch(dpi), unit: 'px/in' } })

const statingNoResolution = copyMeasured({})

describe('reading a scan in millimetres', () => {
    it('puts an inch of scan an inch along the paper', () => {
        expect(onPaper(px(600), scannedAt(600))).toBeCloseTo(25.4, 6)
    })

    it('reads a copy that states none at what the Stanford scans were read at', () => {
        expect(onPaper(px(300.25), statingNoResolution)).toBeCloseTo(25.4, 6)
    })

    it('lays the same run of pixels out longer the coarser the scan was read', () => {
        expect(onPaper(px(1000), scannedAt(150)))
            .toBeGreaterThan(onPaper(px(1000), scannedAt(600)))
    })

    it('leaves the origin where it is', () => {
        expect(onPaper(px(0), scannedAt(600))).toBe(0)
    })
})

describe('finding a place back in the scan', () => {
    it('undoes the reading, which is what a crop relies on', () => {
        expect(inScan(onPaper(px(1234), scannedAt(600)), scannedAt(600))).toBeCloseTo(1234, 6)
        expect(inScan(onPaper(px(1234), statingNoResolution), statingNoResolution))
            .toBeCloseTo(1234, 6)
    })

    it('measures an inch of paper as the copy was scanned', () => {
        expect(inScan(mm(25.4), scannedAt(600))).toBeCloseTo(600, 6)
        expect(inScan(mm(25.4), statingNoResolution)).toBeCloseTo(300.25, 6)
    })
})
