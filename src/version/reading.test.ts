import { describe, expect, it } from 'vitest'
import { mm } from 'linked-rolls'
import { svg } from '../canvas/units'
import { keptApart, velocityAt } from './reading'

/** A curve sampled every millimetre from the beginning of the roll, swelling by one velocity a sample. */
const swell = {
    place: Float64Array.from({ length: 5 }, (_, sample) => sample),
    velocity: Float64Array.from({ length: 5 }, (_, sample) => 40 + sample)
}

describe('the velocity a curve stands at in a place', () => {
    it('is the sample where one falls on the place', () => {
        expect(velocityAt(swell, mm(0))).toBe(40)
        expect(velocityAt(swell, mm(3))).toBe(43)
        expect(velocityAt(swell, mm(4))).toBe(44)
    })

    it('is the nearest sample between two, as the emulator strikes a note there', () => {
        expect(velocityAt(swell, mm(2.4))).toBe(42)
        expect(velocityAt(swell, mm(2.6))).toBe(43)
        expect(velocityAt(swell, mm(0.2))).toBe(40)
    })

    it('is the later sample halfway between two, as a row is rounded', () => {
        expect(velocityAt(swell, mm(2.5))).toBe(43)
    })

    it('is nothing off either end of the curve', () => {
        expect(velocityAt(swell, mm(-0.1))).toBeUndefined()
        expect(velocityAt(swell, mm(4.1))).toBeUndefined()
        expect(velocityAt({ place: new Float64Array(), velocity: new Float64Array() }, mm(0))).toBeUndefined()
    })
})

describe('where the readings at a whisker are written', () => {
    it('is level with their curves where those stand a line apart or more', () => {
        expect(keptApart([svg(-40), svg(-20)], svg(9))).toEqual([-40, -20])
    })

    it('pushes two closer than a line apart, about the middle between them', () => {
        expect(keptApart([svg(-20), svg(-24)], svg(9))).toEqual([-17.5, -26.5])
    })

    it('pushes two at the same height apart in the order they are given', () => {
        expect(keptApart([svg(-30), svg(-30)], svg(9))).toEqual([-34.5, -25.5])
    })

    it('leaves a single reading where it is', () => {
        expect(keptApart([svg(-30)], svg(9))).toEqual([-30])
    })
})
