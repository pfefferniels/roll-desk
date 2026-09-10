import { describe, expect, it } from 'vitest'
import { arrowLine, centreOf, LEAST_LENGTH, Point } from './arrow'

/** The points a path command carries, in the order they are written. */
const numbersIn = (d: string): number[] =>
    (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number)

const startOf = (d: string): Point => {
    const [x, y] = numbersIn(d)
    return { x, y }
}

const endOf = (d: string): Point => {
    const values = numbersIn(d)
    return { x: values[values.length - 2], y: values[values.length - 1] }
}

/** Every arrangement two ends can fall in, so that none of them is left to chance. */
const arrangements: Record<string, [Point, Point]> = {
    'straight down, far': [{ x: 100, y: 50 }, { x: 100, y: 500 }],
    'straight up, far': [{ x: 100, y: 500 }, { x: 100, y: 50 }],
    'along the roll, to the right': [{ x: 100, y: 200 }, { x: 400, y: 200 }],
    'along the roll, to the left': [{ x: 400, y: 200 }, { x: 100, y: 200 }],
    'a short step down': [{ x: 100, y: 200 }, { x: 100, y: 220 }],
    'diagonally': [{ x: 100, y: 100 }, { x: 300, y: 400 }],
    'the same place': [{ x: 250, y: 300 }, { x: 250, y: 300 }],
    'closer than the least length': [{ x: 250, y: 300 }, { x: 252, y: 304 }],
    'above the bar, in the margin': [{ x: 100, y: -40 }, { x: 100, y: 10 }],
    'far down the roll': [{ x: 12000, y: 40 }, { x: 12000, y: 460 }]
}

describe('the arrow between two places on the roll', () => {
    it('is drawn in every arrangement the two ends can fall in', () => {
        Object.entries(arrangements).forEach(([name, [from, to]]) => {
            const line = arrowLine(from, to)

            expect(numbersIn(line.d).every(Number.isFinite), name).toBe(true)
            expect(line.d.startsWith('M'), name).toBe(true)
            expect(Number.isFinite(line.angle), name).toBe(true)
            expect(line.head, name).toEqual(to)
        })
    })

    it('always has a visible length, even where the two ends are one place', () => {
        Object.entries(arrangements).forEach(([name, [from, to]]) => {
            const { d } = arrowLine(from, to)
            const drawn = Math.hypot(endOf(d).x - startOf(d).x, endOf(d).y - startOf(d).y)

            expect(drawn, name).toBeGreaterThan(1)
        })
    })

    /**
     * A command replaced where it stood has both ends in one place. The
     * arrow then comes down into it from just above, rather than
     * collapsing to a dot that cannot be seen or clicked.
     */
    it('comes down into a command replaced where it stood', () => {
        const at = { x: 250, y: 300 }
        const { d } = arrowLine(at, at)
        const start = startOf(d)

        expect(start.y).toBeLessThan(at.y)
        expect(start.x).toBeLessThan(at.x)
        expect(Math.hypot(at.x - start.x, at.y - start.y)).toBeCloseTo(LEAST_LENGTH, 1)
        expect(endOf(d).y).toBeLessThan(at.y)
    })

    /** Whatever the two ends, the arrow is long enough to be seen and hit. */
    it('never draws one shorter than the least length', () => {
        Object.entries(arrangements).forEach(([name, [from, to]]) => {
            const { d } = arrowLine(from, to)
            const start = startOf(d)
            const reach = Math.hypot(to.x - start.x, to.y - start.y)

            expect(reach, name).toBeGreaterThanOrEqual(LEAST_LENGTH - 1e-6)
        })
    })

    it('points its head the way the shaft arrives', () => {
        const down = arrowLine({ x: 100, y: 50 }, { x: 100, y: 500 })
        const up = arrowLine({ x: 100, y: 500 }, { x: 100, y: 50 })
        const right = arrowLine({ x: 100, y: 200 }, { x: 400, y: 200 })

        // 0 is along +x, 90 down the screen, -90 up it.
        expect(Math.abs(down.angle - 90)).toBeLessThan(45)
        expect(Math.abs(up.angle + 90)).toBeLessThan(45)
        expect(Math.abs(right.angle)).toBeLessThan(45)
    })

    /** Long or short, the bow reads as one gesture rather than growing with the roll. */
    it('bows out of the straight without swinging across the roll', () => {
        const bowOf = (from: Point, to: Point) => {
            const [, , cx, cy] = numbersIn(arrowLine(from, to).d)
            const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
            return Math.hypot(cx - midpoint.x, cy - midpoint.y)
        }

        expect(bowOf({ x: 0, y: 0 }, { x: 0, y: 40 })).toBeGreaterThan(2)
        expect(bowOf({ x: 0, y: 0 }, { x: 0, y: 4000 })).toBeLessThan(30)
    })

    it('bows the same way whichever end it starts from', () => {
        const there = arrowLine({ x: 0, y: 0 }, { x: 0, y: 400 })
        const back = arrowLine({ x: 0, y: 400 }, { x: 0, y: 0 })
        const [, , thereX] = numbersIn(there.d)
        const [, , backX] = numbersIn(back.d)

        expect(Math.sign(thereX)).not.toEqual(Math.sign(backX))
    })

    it('takes the middle of a box as the place to point from or at', () => {
        expect(centreOf({ x: 10, y: 20, width: 100, height: 8 })).toEqual({ x: 60, y: 24 })
    })
})
