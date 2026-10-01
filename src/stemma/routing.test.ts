import { describe, expect, it } from 'vitest'
import { endAt, halfwayAlong, Obstacle, roomAt, routeAround } from './routing'
import { point, Point } from '../geometry/drawing'
import { svg } from '../canvas/units'

const at = (x: number, y: number) => point(svg(x), svg(y))

const segment = (from: Point, to: Point, of: string[] = []): Obstacle => ({ from, to, radius: 4, of })

/** The places along a route, every few units, as it is walked from end to end. */
const walk = (route: readonly Point[]) =>
    route.slice(1).flatMap((to, i) => {
        const from = route[i] ?? to
        const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2)
        return Array.from({ length: steps }, (_, s) => ({
            x: from.x + (s / steps) * (to.x - from.x),
            y: from.y + (s / steps) * (to.y - from.y)
        }))
    })

describe('routing a hypothesis round the stemma', () => {
    const from = endAt('S', at(0, 400), 32)
    const to = endAt('B', at(0, 0), 32)

    it('goes straight where nothing is in the way', () => {
        expect(routeAround(from, to, [])).toEqual([from.at, to.at])
    })

    it('goes round a derivation lying across the way, and keeps clear of it', () => {
        const across = segment(at(-100, 200), at(100, 200))
        const route = routeAround(from, to, [across])

        expect(route.at(0)).toEqual(from.at)
        expect(route.at(-1)).toEqual(to.at)
        expect(route.length).toBeGreaterThan(2)
        expect(Math.min(...walk(route).map(p => roomAt(p, [across], [from, to])))).toBeGreaterThanOrEqual(10)
    })

    it('finds its way out between the derivations that meet at the version it leaves', () => {
        const own = [
            segment(from.at, at(0, 200), ['S']),
            segment(from.at, at(-120, 600), ['S']),
            segment(from.at, at(120, 600), ['S'])
        ]
        const route = routeAround(from, to, own)

        expect(route.length).toBeGreaterThan(2)
        expect(Math.min(...walk(route).map(p => roomAt(p, own, [from, to])))).toBeGreaterThanOrEqual(10)
    })

    it('breaks out where the wall is thinnest where nothing leaves it a way round', () => {
        const wall = (from: Point, to: Point, radius: number): Obstacle => ({ from, to, radius, of: [] })
        const pen = [
            wall(at(-60, 340), at(60, 340), 30),
            wall(at(60, 340), at(60, 460), 30),
            wall(at(-60, 340), at(-60, 460), 30),
            wall(at(-60, 460), at(60, 460), 2)
        ]
        const route = routeAround(from, to, pen)

        expect(route.at(-1)).toEqual(to.at)
        expect(route.some(p => p.y > 460)).toBe(true)
    })
})

describe('the place halfway along a route', () => {
    it('is measured along the route, not between its ends', () => {
        const halfway = halfwayAlong([at(0, 0), at(0, 100), at(100, 100)])

        expect(halfway?.at).toEqual(at(0, 100))
    })

    it('says which way the route runs there', () => {
        const halfway = halfwayAlong([at(0, 0), at(0, 60), at(100, 60)])

        expect(halfway?.at).toEqual(at(20, 60))
        expect(halfway?.direction).toEqual(at(100, 0))
    })
})
