import { Svg, svg } from '../canvas/units'
import { apart, Box, convexHull, cross, minus, padded, Point, point } from '../geometry/drawing'
import { getBoundingBox } from '../geometry/getBoundingBox'
import { hullPadding } from './Hull'

/**
 * How much wider a hull is drawn for each hull lying over it that would
 * otherwise cover it. It is the margin every hull keeps round what it
 * touches, which is all the pointer is given of an insertion beside the
 * commands it inserts anyway.
 */
export const ring = hullPadding

/** Something drawn round the corners of what it touches, with none where it is drawn as something else, such as an arrow. */
export interface Footprint<T> {
    of: T
    corners: readonly Point[]
}

/** Something as it is laid in the stack, and by how many rings it is drawn wider to show from under what lies over it. */
export interface Layer<T> {
    of: T
    rings: number
}

type Side = readonly [Point, Point]

/** Each side of a closed polygon, from one corner to the next. */
const sidesOf = (polygon: readonly Point[]): Side[] =>
    polygon.map((corner, i) => [corner, polygon[(i + 1) % polygon.length] ?? corner])

/** The area a convex polygon encloses, nothing where it is a line or a point. */
const areaOf = (sides: readonly Side[]): number =>
    Math.abs(sides.reduce((sum, [a, b]) => sum + a.x * b.y - b.x * a.y, 0)) / 2

/** Whether one box lies wholly within another. */
const within = (inner: Box, outer: Box): boolean =>
    inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height

/** How far a point lies from a stretch of line. */
const fromSide = (p: Point, [a, b]: Side): Svg => {
    const along = minus(b, a)
    const length = along.x ** 2 + along.y ** 2
    const t = length === 0
        ? 0
        : Math.min(1, Math.max(0, ((p.x - a.x) * along.x + (p.y - a.y) * along.y) / length))

    return apart(p, point(svg(a.x + t * along.x), svg(a.y + t * along.y)))
}

/**
 * How far a point lies outside a convex polygon, given by its sides,
 * nothing where it lies within. The polygon is the one `convexHull`
 * gives, whose every corner turns the same way, so a point within lies on
 * the same side of each.
 */
const outsideBy = (p: Point, sides: readonly Side[]): Svg => {
    if (sides.length >= 3 && sides.every(([a, b]) => cross(a, b, p) >= 0)) return svg(0)

    return svg(Math.min(...sides.map(side => fromSide(p, side))))
}

interface Shape<T> extends Footprint<T> {
    /** The sides of the convex hull of the corners. */
    sides: readonly Side[]
    /** The least box holding the corners, none where there are none. */
    bounds?: Box
    area: number
}

/**
 * Whether a hull drawn over another leaves it showing by less than a ring
 * anywhere. Both keep the same margin round their corners, and the one
 * over it is drawn wider by its own rings, so the one beneath shows by
 * less than a ring everywhere where none of its corners lies further
 * outside the other's hull than those rings and one more.
 */
const buries = (over: Layer<unknown> & Shape<unknown>, beneath: Shape<unknown>): boolean => {
    if (!over.bounds || !beneath.bounds) return false

    const reach = svg(ring * (over.rings + 1))

    // Most hulls lie nowhere near each other, which their bounds tell at once.
    if (!within(beneath.bounds, padded(over.bounds, reach))) return false

    return beneath.corners.every(corner => outsideBy(corner, over.sides) < reach)
}

/**
 * The order things lying over each other on the roll are drawn in, from
 * the bottom up, and how much wider each is drawn, so that every one of
 * them shows somewhere to be pointed at.
 *
 * What covers more of the roll lies beneath what covers less, so that a
 * hull lying within another is drawn over it rather than hidden under it.
 * Among equals the order given is kept. That leaves the hulls that nearly
 * coincide, as where a version deletes a note and inserts it again a
 * little shorter: whichever lies beneath shows from under the other by a
 * sliver, or not at all. Such a hull is drawn a ring wider than the one
 * over it, so that it shows round it as an outline of its own.
 *
 * Something with no corners covers nothing, and lies over all of it.
 */
export const stacked = <T>(footprints: readonly Footprint<T>[]): Layer<T>[] => {
    const shapes: Shape<T>[] = footprints
        .map(footprint => {
            const sides = sidesOf(convexHull([...footprint.corners]))
            const bounds = footprint.corners.length ? getBoundingBox([...footprint.corners]) : undefined
            return { ...footprint, sides, bounds, area: areaOf(sides) }
        })
        .sort((a, b) => b.area - a.area)

    // From the top down, so that what lies over a hull already has the
    // width it is drawn at when the hull is looked at.
    const laid: (Layer<T> & Shape<T>)[] = []
    for (const shape of [...shapes].reverse()) {
        const rings = Math.max(0, ...laid.filter(over => buries(over, shape)).map(over => over.rings + 1))
        laid.push({ ...shape, rings })
    }

    return laid.reverse().map(({ of, rings }) => ({ of, rings }))
}
