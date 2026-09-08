import { describe, expect, it } from 'vitest'
import { mm, px } from 'linked-rolls'
import { inScan, onPaper } from './scanResolution'

describe('reading a scan in millimetres', () => {
    it('puts an inch of scan an inch along the paper', () => {
        expect(onPaper(px(300.25))).toBeCloseTo(25.4, 6)
    })

    it('leaves the origin where it is', () => {
        expect(onPaper(px(0))).toBe(0)
    })
})

describe('finding a place back in the scan', () => {
    it('undoes the reading, which is what a crop relies on', () => {
        expect(inScan(onPaper(px(1234)))).toBeCloseTo(1234, 6)
    })

    it('measures an inch of paper as the scan did', () => {
        expect(inScan(mm(25.4))).toBeCloseTo(300.25, 6)
    })
})
