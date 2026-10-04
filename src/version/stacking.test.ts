import { describe, expect, it } from 'vitest'
import { svg } from '../canvas/units'
import { cornersOf } from '../geometry/drawing'
import { Footprint, ring, stacked } from './stacking'

/** Something touching one box, named for what it stands for. */
const lying = (of: string, x: number, y: number, width: number, height: number): Footprint<string> =>
    ({ of, corners: cornersOf({ x: svg(x), y: svg(y), width: svg(width), height: svg(height) }) })

const arrow = (of: string): Footprint<string> => ({ of, corners: [] })

describe('the order things lying over each other are drawn in', () => {
    it('keeps the order given where none of them is larger', () => {
        const order = stacked([lying('a', 0, 0, 10, 3), lying('b', 50, 0, 10, 3)])

        expect(order.map(layer => layer.of)).toEqual(['a', 'b'])
    })

    it('lays what covers more of the roll beneath what covers less', () => {
        const order = stacked([lying('small', 0, 0, 10, 3), lying('large', 0, 0, 40, 30)])

        expect(order.map(layer => layer.of)).toEqual(['large', 'small'])
    })

    it('lays a hull within another over it, the other showing well enough round it', () => {
        const order = stacked([lying('inside', 10, 10, 10, 3), lying('around', 0, 0, 40, 30)])

        expect(order).toEqual([{ of: 'around', rings: 0 }, { of: 'inside', rings: 0 }])
    })

    it('lays what has no corners, such as an arrow, over all of it', () => {
        const order = stacked([arrow('shift'), lying('a', 0, 0, 10, 3)])

        expect(order).toEqual([{ of: 'a', rings: 0 }, { of: 'shift', rings: 0 }])
    })
})

describe('how much wider a hull is drawn to show from under another', () => {
    it('is not at all where nothing lies over it', () => {
        expect(stacked([lying('a', 0, 0, 10, 3)])).toEqual([{ of: 'a', rings: 0 }])
    })

    it('is a ring where another lies exactly over it', () => {
        const order = stacked([lying('deleted', 0, 0, 10, 3), lying('inserted', 0, 0, 10, 3)])

        expect(order).toEqual([{ of: 'deleted', rings: 1 }, { of: 'inserted', rings: 0 }])
    })

    /** A note deleted and inserted again a little shorter, as the collation gives it. */
    it('is a ring where it shows from under the other by a sliver only', () => {
        const order = stacked([lying('deleted', 0, 0, 10.6, 3), lying('inserted', 0, 0, 10, 3)])

        expect(order).toEqual([{ of: 'deleted', rings: 1 }, { of: 'inserted', rings: 0 }])
    })

    it('is not at all where it shows from under the other by a ring or more', () => {
        const order = stacked([lying('deleted', 0, 0, 10 + ring, 3), lying('inserted', 0, 0, 10, 3)])

        expect(order).toEqual([{ of: 'deleted', rings: 0 }, { of: 'inserted', rings: 0 }])
    })

    it('is one ring more for each hull lying over the one over it', () => {
        const order = stacked([lying('a', 0, 0, 10, 3), lying('b', 0, 0, 10, 3), lying('c', 0, 0, 10, 3)])

        expect(order).toEqual([{ of: 'a', rings: 2 }, { of: 'b', rings: 1 }, { of: 'c', rings: 0 }])
    })

    it('is not at all where an arrow lies over it', () => {
        const order = stacked([lying('a', 0, 0, 10, 3), arrow('shift')])

        expect(order).toEqual([{ of: 'a', rings: 0 }, { of: 'shift', rings: 0 }])
    })

    it('is not at all where the other only overlaps it', () => {
        const order = stacked([lying('a', 0, 0, 10, 3), lying('b', 5, 0, 10, 3)])

        expect(order).toEqual([{ of: 'a', rings: 0 }, { of: 'b', rings: 0 }])
    })
})
