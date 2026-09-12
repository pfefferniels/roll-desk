import { describe, expect, it } from 'vitest'
import { add } from 'linked-rolls'
import { arrowLine, Boxed, centreOf, LEAST_LENGTH } from './arrow'
import { Point, point } from './drawing'
import { svg } from './units'

const numbersIn = (d: string): number[] =>
    (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number)

const startOf = (d: string): Point => {
    const [x, y] = numbersIn(d)
    return point(svg(x), svg(y))
}

const endOf = (d: string): Point => {
    const values = numbersIn(d)
    return point(svg(values[values.length - 2]), svg(values[values.length - 1]))
}

const box = (x: number, y: number, width: number, height: number): Boxed =>
    ({ x: svg(x), y: svg(y), width: svg(width), height: svg(height) })

const inside = (at: Point, of: Boxed): boolean =>
    at.x > of.x && at.x < add(of.x, of.width)
    && at.y > of.y && at.y < add(of.y, of.height)

/**
 * Every arrangement two perforations can fall in. A command is a wide,
 * shallow box, one lane high and as long as it sounds, so most of these
 * are wide boxes lying over each other.
 */
const arrangements: Record<string, [Boxed, Boxed]> = {
    'two lanes apart, the same stretch of roll': [box(100, 60, 200, 10), box(100, 450, 200, 10)],
    'the same, the other way up': [box(100, 450, 200, 10), box(100, 60, 200, 10)],
    'one lane apart': [box(100, 440, 200, 10), box(100, 460, 200, 10)],
    'lying exactly over each other': [box(100, 200, 200, 10), box(100, 200, 200, 10)],
    'overlapping by most of their length': [box(100, 200, 200, 10), box(120, 200, 200, 10)],
    'overlapping, and a lane apart': [box(100, 200, 200, 10), box(120, 220, 200, 10)],
    'one inside the other': [box(100, 200, 400, 10), box(200, 200, 60, 10)],
    'along the roll, clear of each other': [box(100, 200, 60, 10), box(400, 200, 60, 10)],
    'along the roll, backwards': [box(400, 200, 60, 10), box(100, 200, 60, 10)],
    'a hair apart': [box(100, 200, 60, 10), box(101, 201, 60, 10)],
    'up in the margin above the bar': [box(100, -40, 60, 10), box(100, 10, 60, 10)],
    'far down a ten metre roll': [box(12000, 40, 200, 10), box(12000, 460, 200, 10)],
    'the deleted one spanning two lanes': [box(100, 440, 200, 20), box(100, 60, 200, 10)]
}

describe('the arrow between two things on the roll', () => {
    it('is drawn in every arrangement the two can fall in', () => {
        Object.entries(arrangements).forEach(([name, [from, to]]) => {
            const line = arrowLine(from, to)

            expect(numbersIn(line.d).every(Number.isFinite), name).toBe(true)
            expect(line.d.startsWith('M'), name).toBe(true)
            expect(Number.isFinite(line.angle), name).toBe(true)
        })
    })

    it('always reaches far enough to be seen and hit', () => {
        Object.entries(arrangements).forEach(([name, [from, to]]) => {
            const { d, head } = arrowLine(from, to)
            const reach = Math.hypot(head.x - startOf(d).x, head.y - startOf(d).y)

            expect(reach, name).toBeGreaterThanOrEqual(LEAST_LENGTH - 1e-6)
        })
    })

    /**
     * A head buried in a black perforation reads as a spike growing out
     * of it rather than as an arrow arriving at it.
     */
    it('never puts its head inside what it points at', () => {
        Object.entries(arrangements).forEach(([name, [from, to]]) => {
            expect(inside(arrowLine(from, to).head, to), name).toBe(false)
        })
    })

    it('never ends its shaft inside what it points at', () => {
        Object.entries(arrangements).forEach(([name, [from, to]]) => {
            expect(inside(endOf(arrowLine(from, to).d), to), name).toBe(false)
        })
    })

    it('stops at the near edge of what it points at, where there is room', () => {
        const { head } = arrowLine(box(100, 60, 200, 10), box(100, 450, 200, 10))

        // just above the target's top edge, coming down onto it
        expect(head.y).toBeLessThan(450)
        expect(head.y).toBeGreaterThan(440)
    })

    /** Two commands in one place: the arrow comes down into the second from above. */
    it('comes down into one replaced where it stood', () => {
        const target = box(100, 200, 200, 10)
        const { d, head } = arrowLine(box(100, 200, 200, 10), target)

        expect(head.y).toBeLessThan(target.y)
        expect(head.x).toBeCloseTo(centreOf(target).x, 6)
        expect(startOf(d).y).toBeLessThan(head.y)
        expect(startOf(d).x).toBeLessThan(head.x)
    })

    it('points its head the way the shaft arrives', () => {
        const down = arrowLine(box(100, 60, 200, 10), box(100, 450, 200, 10))
        const up = arrowLine(box(100, 450, 200, 10), box(100, 60, 200, 10))
        const right = arrowLine(box(100, 200, 60, 10), box(400, 200, 60, 10))

        expect(Math.abs(down.angle - 90)).toBeLessThan(50)
        expect(Math.abs(up.angle + 90)).toBeLessThan(50)
        expect(Math.abs(right.angle)).toBeLessThan(50)
    })

    it('bows out of the straight without swinging across the roll', () => {
        const bowOf = (from: Boxed, to: Boxed) => {
            const { d } = arrowLine(from, to)
            const [, , cx, cy] = numbersIn(d)
            const middle = { x: (startOf(d).x + endOf(d).x) / 2, y: (startOf(d).y + endOf(d).y) / 2 }
            return Math.hypot(cx - middle.x, cy - middle.y)
        }

        expect(bowOf(box(0, 0, 10, 10), box(0, 80, 10, 10))).toBeGreaterThan(2)
        expect(bowOf(box(0, 0, 10, 10), box(0, 4000, 10, 10))).toBeLessThan(26)
    })

    it('bows the same way whichever end it starts from', () => {
        const [, , thereX] = numbersIn(arrowLine(box(0, 0, 10, 10), box(0, 400, 10, 10)).d)
        const [, , backX] = numbersIn(arrowLine(box(0, 400, 10, 10), box(0, 0, 10, 10)).d)

        expect(Math.sign(thereX - 5)).not.toEqual(Math.sign(backX - 5))
    })

    it('takes the middle of a box as the place to reckon from', () => {
        expect(centreOf(box(10, 20, 100, 8))).toEqual({ x: 60, y: 24 })
    })
})
