import { describe, expect, it } from 'vitest'
import { fittingScale, scaleLimits, turned } from './writingFit'

describe('a text turned on the drawing', () => {
    it('keeps its size unturned', () => {
        expect(turned({ width: 100, height: 20 }, 0)).toEqual({ width: 100, height: 20 })
    })

    it('stands on end turned a right angle', () => {
        const { width, height } = turned({ width: 100, height: 20 }, 90)
        expect(width).toBeCloseTo(20)
        expect(height).toBeCloseTo(100)
    })
})

describe('how far a writing is scaled to fill its box', () => {
    it('fits its lines to the height of a box across the roll once turned', () => {
        // 100 wide and 20 tall, turned upright into a box 40 wide and 50 tall
        expect(fittingScale({ width: 100, height: 20 }, { width: 40, height: 50 }, 90)).toBeCloseTo(0.5)
    })

    it('is held by the box\'s width where that is the narrower', () => {
        expect(fittingScale({ width: 100, height: 20 }, { width: 10, height: 500 }, 90)).toBeCloseTo(0.5)
    })

    it('neither vanishes nor swells past its limits', () => {
        expect(fittingScale({ width: 100, height: 20 }, { width: 1, height: 1 }, 90)).toBe(scaleLimits.least)
        expect(fittingScale({ width: 10, height: 2 }, { width: 1000, height: 1000 }, 90)).toBe(scaleLimits.most)
    })

    it('leaves a text that measures nothing as it is', () => {
        expect(fittingScale({ width: 0, height: 0 }, { width: 10, height: 10 }, 90)).toBe(1)
    })
})
