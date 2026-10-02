type Pt = { x: number, y: number }

/** A segment thickened to a radius, which is a disc where both of its ends are the same place. */
export interface Thickened {
    from: Pt
    to: Pt
    radius: number
}

/** Something drawn on the stemma that the pointer can land on: a polygon, or a thickened segment. */
export type Shape = { points: readonly Pt[] } | Thickened

const distanceToSegment = (p: Pt, a: Pt, b: Pt): number => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length2 = dx * dx + dy * dy
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

/** How far apart two segments come, nothing where they cross. */
const segmentsApart = (a: Pt, b: Pt, c: Pt, d: Pt): number => {
    const crossing = cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
    return crossing ? 0 : Math.min(
        distanceToSegment(a, c, d), distanceToSegment(b, c, d),
        distanceToSegment(c, a, b), distanceToSegment(d, a, b)
    )
}

const insidePolygon = (p: Pt, points: readonly Pt[]): boolean => {
    let inside = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i]
        const b = points[j]
        if (a && b && (a.y > p.y) !== (b.y > p.y) && p.x < a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y)) inside = !inside
    }
    return inside
}

const inside = (p: Pt, shape: Shape): boolean =>
    'points' in shape
        ? insidePolygon(p, shape.points)
        : distanceToSegment(p, shape.from, shape.to) <= shape.radius

/** How many points a thickened segment's outline is walked in, round each end and along each side. */
const roundSamples = 16
const sideSamples = 8

/** Points along the outline of a shape, close enough together that no overlap slips between them. */
const outlinePoints = (shape: Shape): readonly Pt[] => {
    if ('points' in shape) return shape.points

    const { from, to, radius } = shape
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    const round = Array.from({ length: roundSamples }, (_, i) => {
        const angle = (2 * Math.PI * i) / roundSamples
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
    })
    if (length === 0) return round.map(p => ({ x: from.x + p.x, y: from.y + p.y }))

    const normal = { x: -(to.y - from.y) / length * radius, y: (to.x - from.x) / length * radius }
    const sides = Array.from({ length: sideSamples + 1 }, (_, i) => i / sideSamples).flatMap(t => {
        const on = { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) }
        return [{ x: on.x + normal.x, y: on.y + normal.y }, { x: on.x - normal.x, y: on.y - normal.y }]
    })
    return [
        ...round.map(p => ({ x: from.x + p.x, y: from.y + p.y })),
        ...round.map(p => ({ x: to.x + p.x, y: to.y + p.y })),
        ...sides
    ]
}

interface Bounds { left: number, top: number, right: number, bottom: number }

const boundsOf = (shape: Shape): Bounds => {
    const points = 'points' in shape ? shape.points : [shape.from, shape.to]
    const margin = 'points' in shape ? 0 : shape.radius
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    return {
        left: Math.min(...xs) - margin,
        top: Math.min(...ys) - margin,
        right: Math.max(...xs) + margin,
        bottom: Math.max(...ys) + margin
    }
}

const meet = (a: Bounds, b: Bounds) =>
    a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom

/** A shape's bounds and outline, worked out once however often it is tested. */
const measured = new WeakMap<Shape, { bounds: Bounds, outline: readonly Pt[] }>()
const measuresOf = (shape: Shape) => {
    const known = measured.get(shape)
    if (known) return known

    const measures = { bounds: boundsOf(shape), outline: outlinePoints(shape) }
    measured.set(shape, measures)
    return measures
}

/**
 * Whether two shapes overlap anywhere the pointer can reach both. Where
 * something else is drawn over them both, such as a version over the
 * ends of its derivations, the pointer lands on that instead, and an
 * overlap there does not count.
 */
export const overlap = (a: Shape, b: Shape, covered: (p: Pt) => boolean = () => false): boolean => {
    const ofA = measuresOf(a)
    const ofB = measuresOf(b)
    return meet(ofA.bounds, ofB.bounds) && !apart(a, b) && (
        ofA.outline.some(p => inside(p, b) && !covered(p)) ||
        ofB.outline.some(p => inside(p, a) && !covered(p))
    )
}

/**
 * Whether a polygon and a thickened segment are certainly clear of each
 * other: the segment lies outside the polygon and keeps further from
 * its edges than its thickness. Most of what is tested is, and this
 * settles it without walking their outlines.
 */
const apart = (a: Shape, b: Shape): boolean => {
    if ('points' in a === 'points' in b) return false
    const [polygon, segment] = 'points' in a ? [a, b] : [b, a]
    if ('points' in segment || !('points' in polygon)) return false

    const { points } = polygon
    const { from, to, radius } = segment
    if (insidePolygon(from, points) || insidePolygon(to, points)) return false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const p = points[i]
        const q = points[j]
        if (p && q && segmentsApart(from, to, p, q) <= radius) return false
    }
    return true
}

/** Something an opened balloon runs into, and which way the two must go apart. */
export interface Clash {
    /**
     * The versions heading the parts of the stemma that move with each:
     * that of the opened balloon, then that of what it runs into.
     */
    movers: readonly [string, string]
    /** Which way what it runs into lies from the balloon: to the left, or to the right. */
    side: -1 | 1
}

/**
 * Moves parts of the stemma sideways, a step at a time, until nothing
 * clashes, or as many rounds as given have passed. Each part moves with
 * every version descending from it, so that the derivations further down
 * keep their shape. Where one part descends from the other, only the
 * lower one moves. Says whether anything moved.
 */
export const spreadApart = (
    nodes: readonly { id: string, x?: number }[],
    childrenOf: (id: string) => readonly string[],
    clashes: () => readonly Clash[],
    { step = 12, rounds = 150 } = {}
): boolean => {
    const subtrees = new Map<string, Set<string>>()
    const subtreeOf = (root: string): Set<string> => {
        const known = subtrees.get(root)
        if (known) return known

        const reached = new Set<string>()
        const pending = [root]
        for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
            if (reached.has(id)) continue
            reached.add(id)
            pending.push(...childrenOf(id))
        }
        subtrees.set(root, reached)
        return reached
    }

    let moved = false
    for (let round = 0; round < rounds; round++) {
        const found = clashes()
        if (found.length === 0) break

        // A pair that clashes several ways, or each over the other, is
        // pushed apart once a round.
        const pairs = new Map<string, Clash>()
        for (const clash of found) {
            const [a, b] = clash.movers
            if (a === b) continue
            const key = a < b ? `${a} ${b} ${clash.side}` : `${b} ${a} ${-clash.side}`
            pairs.set(key, clash)
        }

        const shift = new Map<string, number>()
        const push = (root: string, by: number) => {
            for (const id of subtreeOf(root)) shift.set(id, (shift.get(id) ?? 0) + by)
        }
        for (const { movers: [a, b], side } of pairs.values()) {
            if (subtreeOf(b).has(a)) push(a, -side * step)
            else if (subtreeOf(a).has(b)) push(b, side * step)
            else {
                push(a, -side * step / 2)
                push(b, side * step / 2)
            }
        }

        if (shift.size === 0) break
        for (const node of nodes) node.x = (node.x ?? 0) + (shift.get(node.id) ?? 0)
        moved = true
    }
    return moved
}
