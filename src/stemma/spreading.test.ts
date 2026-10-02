import { describe, expect, it } from 'vitest'
import { Clash, overlap, Shape, spreadApart } from './spreading'

const square = (left: number, top: number, side: number): Shape => ({
    points: [{ x: left, y: top }, { x: left + side, y: top }, { x: left + side, y: top + side }, { x: left, y: top + side }]
})

const disc = (x: number, y: number, radius: number): Shape => ({ from: { x, y }, to: { x, y }, radius })

describe('whether two shapes overlap', () => {
    it('finds a disc lying on a polygon', () => {
        expect(overlap(square(0, 0, 100), disc(110, 50, 20))).toBe(true)
    })

    it('finds a disc that the polygon holds whole', () => {
        expect(overlap(square(0, 0, 100), disc(50, 50, 10))).toBe(true)
    })

    it('finds none where a disc keeps off the polygon', () => {
        expect(overlap(square(0, 0, 100), disc(130, 50, 20))).toBe(false)
    })

    it('finds a line crossing a polygon, though neither has a point inside the other', () => {
        expect(overlap(square(0, 0, 100), { from: { x: -50, y: 50 }, to: { x: 150, y: 50 }, radius: 1 })).toBe(true)
    })

    it('finds two polygons lying on each other', () => {
        expect(overlap(square(0, 0, 100), square(90, 90, 100))).toBe(true)
    })

    it('does not count an overlap where something is drawn over both', () => {
        const overCorner = (p: { x: number, y: number }) => Math.hypot(p.x - 100, p.y - 100) < 30

        expect(overlap(square(0, 0, 100), disc(110, 110, 15), overCorner)).toBe(false)
    })
})

describe('spreading the stemma apart', () => {
    const tree = (children: Record<string, string[]>) => (id: string) => children[id] ?? []

    it('moves two clashing parts apart, each with what descends from it, until they no longer clash', () => {
        const nodes = [{ id: 'a', x: 0 }, { id: 'b', x: 10 }, { id: 'c', x: 0 }]
        const at = (id: string) => nodes.find(node => node.id === id)?.x ?? 0
        const clashes = (): Clash[] => at('b') - at('a') < 50 ? [{ movers: ['a', 'b'], side: 1 }] : []

        expect(spreadApart(nodes, tree({ a: ['c'] }), clashes)).toBe(true)
        expect(at('b') - at('a')).toBeGreaterThanOrEqual(50)
        expect(at('a') + at('b')).toBeCloseTo(10)
        expect(at('c')).toBe(at('a'))
    })

    it('moves only the lower part where one descends from the other', () => {
        const nodes = [{ id: 'a', x: 0 }, { id: 'b', x: 0 }]
        const at = (id: string) => nodes.find(node => node.id === id)?.x ?? 0
        const clashes = (): Clash[] => at('b') - at('a') < 40 ? [{ movers: ['a', 'b'], side: 1 }] : []

        spreadApart(nodes, tree({ b: ['a'] }), clashes)

        expect(at('b')).toBe(0)
        expect(at('a')).toBeLessThanOrEqual(-40)
    })

    it('leaves a stemma alone where nothing clashes', () => {
        const nodes = [{ id: 'a', x: 0 }]

        expect(spreadApart(nodes, tree({}), () => [])).toBe(false)
        expect(nodes[0]?.x).toBe(0)
    })
})
