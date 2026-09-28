import { describe, expect, it } from 'vitest'
import { Slice, sliceCentre } from './SlicedBalloon'

const slice = (id: string, count: number): Slice => ({ id, count, description: id })

describe('where a slice of the balloon sits', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 0, y: 100 }
    const halves = [slice('one', 4), slice('other', 4)]

    it('puts a slice halfway along the balloon', () => {
        expect(sliceCentre(a, b, halves, 'one')?.y).toBeCloseTo(50)
    })

    it('puts two slices of a weight on either side of the line, as far off it as each other', () => {
        const one = sliceCentre(a, b, halves, 'one')
        const other = sliceCentre(a, b, halves, 'other')

        expect(one!.x).toBeCloseTo(-other!.x)
        expect(Math.abs(one!.x)).toBeGreaterThan(0)
    })

    it('keeps a slice within the balloon', () => {
        const centre = sliceCentre(a, b, halves, 'one')

        // the balloon reaches 0.3 of its length to either side
        expect(Math.abs(centre!.x)).toBeLessThan(30)
    })

    it('leaves the middle to the one motivation a derivation carries', () => {
        const centre = sliceCentre(a, b, [slice('only', 12)], 'only')

        expect(centre?.x).toBeCloseTo(0)
        expect(centre?.y).toBeCloseTo(50)
    })

    it('says nothing of a motivation the balloon has no slice for', () => {
        expect(sliceCentre(a, b, halves, 'elsewhere')).toBeUndefined()
    })
})
