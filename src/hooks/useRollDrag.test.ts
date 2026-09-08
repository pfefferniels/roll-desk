import { describe, expect, it } from 'vitest'
import { mm } from 'linked-rolls'
import { spanDragged } from './useRollDrag'

const drag = (from: number, to: number) => ({ from: mm(from), to: mm(to) })

describe('the stretch a gesture marks', () => {
    it('runs from where the drag began to where it ended', () => {
        expect(spanDragged(drag(10, 40), 1)).toEqual([10, 40])
    })

    it('reads a drag drawn backwards the same way round', () => {
        expect(spanDragged(drag(40, 10), 1)).toEqual([10, 40])
    })

    it('is nothing where the pointer never moved', () => {
        expect(spanDragged(drag(10, 10), 1)).toBeUndefined()
    })

    it('is nothing where the pointer only wandered a pixel or two', () => {
        expect(spanDragged(drag(10, 12), 1)).toBeUndefined()
    })

    it('measures the wandering on screen rather than on the roll', () => {
        expect(spanDragged(drag(10, 12), 0.1)).toBeUndefined()
        expect(spanDragged(drag(10, 12), 10)).toEqual([10, 12])
    })
})
