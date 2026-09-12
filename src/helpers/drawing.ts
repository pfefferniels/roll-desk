import { add, scale, subtract } from 'linked-rolls'
import { Svg, svg } from './units'

/** A place on the drawing, and equally a vector between two of them. */
export interface Point {
    x: Svg
    y: Svg
}

export const point = (x: Svg, y: Svg): Point => ({ x, y })

/** A rectangle on the drawing, as an SVG rect takes one. */
export interface Box {
    x: Svg
    y: Svg
    width: Svg
    height: Svg
}

/** A horizontal stripe of the drawing, which is what a set of lanes occupies. */
export interface Band {
    y: Svg
    height: Svg
}

export const plus = (a: Point, b: Point): Point => point(add(a.x, b.x), add(a.y, b.y))

export const minus = (a: Point, b: Point): Point => point(subtract(a.x, b.x), subtract(a.y, b.y))

export const times = (a: Point, factor: number): Point => point(scale(a.x, factor), scale(a.y, factor))

/** A point moved along a direction by a plain factor. */
export const along = (from: Point, direction: Point, factor: number): Point =>
    plus(from, times(direction, factor))

export const lengthOf = ({ x, y }: Point): Svg => svg(Math.hypot(x, y))

export const apart = (a: Point, b: Point): Svg => lengthOf(minus(a, b))

/** The vector one unit long in the same direction, or nothing where there is no direction. */
export const unit = (a: Point): Point | undefined => {
    const length = lengthOf(a)
    return length === 0 ? undefined : times(a, 1 / length)
}

/** Turned a quarter turn, which is how a normal to a line is taken. */
export const perpendicular = ({ x, y }: Point): Point => point(scale(y, -1), x)

/** A box grown by the same margin on every side. */
export const padded = (box: Box, margin: Svg): Box => ({
    x: subtract(box.x, margin),
    y: subtract(box.y, margin),
    width: add(box.width, scale(margin, 2)),
    height: add(box.height, scale(margin, 2))
})

/** The four corners of a box, which is what a hull is drawn around. */
export const cornersOf = ({ x, y, width, height }: Box): Point[] => [
    point(x, y),
    point(add(x, width), y),
    point(add(x, width), add(y, height)),
    point(x, add(y, height))
]

/** The middle of a box. */
export const middleOf = (box: Box): Point =>
    point(add(box.x, scale(box.width, 0.5)), add(box.y, scale(box.height, 0.5)))

/** Which way the turn goes at `a` on the way from `o` to `b`. */
const cross = (o: Point, a: Point, b: Point): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

/** Whether the chain's last turn bends back on itself at `p`, so its end should go. */
const turnsBack = (chain: Point[], p: Point): boolean => {
    const before = chain.at(-2)
    const last = chain.at(-1)
    return before !== undefined && last !== undefined && cross(before, last, p) <= 0
}

/** One side of the hull, walked over the points in the order given. */
const chainOver = (points: Point[]): Point[] =>
    points.reduce<Point[]>((chain, p) => {
        while (turnsBack(chain, p)) chain.pop()
        chain.push(p)
        return chain
    }, [])

/**
 * The convex hull of the points, by Andrew's monotone chain: the lower
 * side walked left to right, the upper side back again. Each side ends
 * where the other begins, so that end is dropped.
 */
export const convexHull = (points: Point[]): Point[] => {
    if (points.length < 3) return [...points]

    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
    const lower = chainOver(sorted)
    const upper = chainOver([...sorted].reverse())

    return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

/** A closed path through the points, or nothing where there are none. */
export const hullToSvgPath = (hull: Point[]): string => {
    const [first, ...rest] = hull
    if (!first) return ''

    const lines = rest.map(p => `L ${p.x} ${p.y}`).join(' ')
    return `M ${first.x} ${first.y} ${lines} Z`
}
