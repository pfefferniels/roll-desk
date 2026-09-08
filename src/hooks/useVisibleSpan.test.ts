import { describe, expect, it } from 'vitest'
import { spanShown } from './useVisibleSpan'

const width = 600
const viewport = (scrollLeft: number) => ({ scrollLeft, clientWidth: width })

describe('the stretch of roll a viewport shows', () => {
    it('covers the view with a viewport width to spare on either side', () => {
        expect(spanShown(viewport(0), 1)).toEqual({ from: -600, to: 1500 })
    })

    it('measures in millimetres, so a closer zoom shows less roll', () => {
        expect(spanShown(viewport(0), 2)).toEqual({ from: -300, to: 750 })
    })

    it('stays the same until the view has moved on', () => {
        expect(spanShown(viewport(299), 1)).toEqual(spanShown(viewport(0), 1))
        expect(spanShown(viewport(300), 1)).not.toEqual(spanShown(viewport(0), 1))
    })

    it('keeps its slack wherever the view sits in the roll', () => {
        const zoom = 2;

        [0, 1, 299, 300, 6000, 12345].forEach(scrollLeft => {
            const { from, to } = spanShown(viewport(scrollLeft), zoom)
            const spare = width / zoom

            expect(from).toBeLessThanOrEqual(scrollLeft / zoom - spare)
            expect(to).toBeGreaterThanOrEqual((scrollLeft + width) / zoom + spare)
        })
    })
})
