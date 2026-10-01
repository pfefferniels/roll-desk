import { point, Point } from '../geometry/drawing'
import { svg } from '../canvas/units'

/**
 * Something a route keeps clear of: a segment thickened to the radius
 * given, or a disc where both ends of it are the same place.
 */
export interface Obstacle {
    from: Point
    to: Point
    radius: number
    /**
     * The versions it belongs to. A route leaving or reaching one of them
     * starts inside it, so the obstacle gives way near that version.
     */
    of: readonly string[]
}

/** Where a route starts or ends: a version, where it is drawn, and how far around it its own obstacles give way. */
export interface End {
    id: string
    at: Point
    reach: number
}

/** The side of a cell of the grid a route is looked for on. */
const cell = 8

/** How close a route may come to an obstacle. */
const clearance = 10

/** How far from every obstacle a route would rather keep, where there is the room. */
const comfort = 32

/** How much dearer a step is right at the clearance than in comfort, which keeps a route in the middle of a gap. */
const crowding = 2

/**
 * How much dearer a step is inside the clearance of an obstacle than in
 * comfort: so much that a route crosses one only where nothing leaves it
 * a way round, and then where the crossing is shortest.
 */
const trespass = 1000

/** How far beyond everything a route may go to get round the outside. */
const margin = 120

/**
 * A version a route leaves or reaches, drawn as a disc of the radius
 * given. Its own obstacles give way within the clearance of its edge
 * and as far again, so that the route can find a way out between the
 * derivations that meet there.
 */
export const endAt = (id: string, at: Point, radius: number): End =>
    ({ id, at, reach: radius + 2 * clearance })

type Pt = { x: number, y: number }

// Asked many thousand times for every route, so it is kept to plain
// arithmetic.
const distanceToSegment = (p: Pt, a: Pt, b: Pt): number => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length2 = dx * dx + dy * dy
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
    const x = p.x - (a.x + t * dx)
    const y = p.y - (a.y + t * dy)
    return Math.sqrt(x * x + y * y)
}

/**
 * How far a place is from the nearest obstacle a route between the ends
 * must keep clear of, made ready to be asked of many places.
 */
const roomFinder = (obstacles: readonly Obstacle[], ends: readonly End[]) => {
    const owners = obstacles.map(obstacle => ends.filter(end => obstacle.of.includes(end.id)))

    return (p: Pt): number => {
        let nearest = Infinity
        obstacles.forEach((obstacle, k) => {
            const own = owners[k] ?? []
            if (own.length > 0 && own.some(end => Math.hypot(p.x - end.at.x, p.y - end.at.y) < end.reach)) return
            nearest = Math.min(nearest, distanceToSegment(p, obstacle.from, obstacle.to) - obstacle.radius)
        })
        return nearest
    }
}

/** How far a place is from the nearest obstacle a route between the ends must keep clear of. */
export const roomAt = (p: Pt, obstacles: readonly Obstacle[], ends: readonly End[]): number =>
    roomFinder(obstacles, ends)(p)

/**
 * A grid laid over the drawing, with the room left at each of its points
 * as far as a route minds it: beyond the comfort of every obstacle the
 * room is not measured, and taken to be unbounded. Every route across the
 * drawing searches the same grid, so it is worked out once for all of them.
 */
export interface Field {
    left: number
    top: number
    columns: number
    rows: number
    rooms: Float64Array
}

/** The grid over the obstacles and the places given, as far beyond them as a route may go. */
export const fieldOf = (obstacles: readonly Obstacle[], places: readonly Pt[] = []): Field => {
    const all = [...places, ...obstacles.flatMap(obstacle => [obstacle.from, obstacle.to])]
    const xs = all.map(p => p.x)
    const ys = all.map(p => p.y)
    const left = Math.min(...xs) - margin
    const top = Math.min(...ys) - margin
    const columns = Math.ceil((Math.max(...xs) + margin - left) / cell) + 1
    const rows = Math.ceil((Math.max(...ys) + margin - top) / cell) + 1

    // Each obstacle is measured from the points within its comfort only.
    const rooms = new Float64Array(columns * rows).fill(Infinity)
    const span = (low: number, high: number, origin: number, count: number, reach: number) =>
        [Math.max(0, Math.floor((low - reach - origin) / cell)), Math.min(count - 1, Math.ceil((high + reach - origin) / cell))]

    for (const { from, to, radius } of obstacles) {
        const reach = radius + comfort
        const [x0 = 0, x1 = -1] = span(Math.min(from.x, to.x), Math.max(from.x, to.x), left, columns, reach)
        const [y0 = 0, y1 = -1] = span(Math.min(from.y, to.y), Math.max(from.y, to.y), top, rows, reach)
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const c = y * columns + x
                const room = distanceToSegment({ x: left + x * cell, y: top + y * cell }, from, to) - radius
                if (room < (rooms[c] ?? Infinity)) rooms[c] = room
            }
        }
    }
    return { left, top, columns, rows, rooms }
}

const placeIn = ({ left, top, columns }: Field, c: number): Pt =>
    ({ x: left + (c % columns) * cell, y: top + Math.floor(c / columns) * cell })

/** The point of the grid nearest a place, and nothing where the place is off the grid. */
const cellIn = ({ left, top, columns, rows }: Field, p: Pt): number | undefined => {
    const column = Math.round((p.x - left) / cell)
    const row = Math.round((p.y - top) / cell)
    return column >= 0 && row >= 0 && column < columns && row < rows ? row * columns + column : undefined
}

/** The points of the grid within the distance given of a place. */
const cellsAround = (field: Field, p: Pt, distance: number): number[] => {
    const span = Math.ceil(distance / cell)
    const centre = cellIn(field, p)
    if (centre === undefined) return []

    const column = centre % field.columns
    const row = Math.floor(centre / field.columns)
    const cells = []
    for (let y = Math.max(0, row - span); y <= Math.min(field.rows - 1, row + span); y++) {
        for (let x = Math.max(0, column - span); x <= Math.min(field.columns - 1, column + span); x++) {
            cells.push(y * field.columns + x)
        }
    }
    return cells
}

/** What a step costs for each unit of its length, at a place with the room given. */
const priceOf = (room: number) =>
    room < clearance ? trespass : 1 + crowding * Math.max(0, (comfort - room) / comfort)

/**
 * The frontier of a search: points of the grid by the estimate of the
 * way through them, the cheapest at the head. A point may stand in it
 * more than once, its cheaper estimate coming out first.
 */
const frontierOf = () => {
    const points: number[] = []
    const estimates: number[] = []

    const put = (i: number, point: number, estimate: number) => {
        points[i] = point
        estimates[i] = estimate
    }

    return {
        push: (point: number, estimate: number) => {
            let i = points.length
            while (i > 0) {
                const up = (i - 1) >> 1
                if ((estimates[up] ?? 0) <= estimate) break
                put(i, points[up] ?? 0, estimates[up] ?? 0)
                i = up
            }
            put(i, point, estimate)
        },

        pop: (): number | undefined => {
            const head = points[0]
            const last = points.pop()
            const lastEstimate = estimates.pop() ?? Infinity
            if (last === undefined || points.length === 0) return head

            let i = 0
            for (;;) {
                const left = 2 * i + 1
                const right = left + 1
                const smaller = (estimates[right] ?? Infinity) < (estimates[left] ?? Infinity) ? right : left
                const estimate = estimates[smaller] ?? Infinity
                if (estimate >= lastEstimate) break
                put(i, points[smaller] ?? 0, estimate)
                i = smaller
            }
            put(i, last, lastEstimate)
            return head
        }
    }
}

/** The eight neighbours of a point of the grid, as steps across and down, and how long each step is. */
const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    .map(([dx = 0, dy = 0]) => ({ dx, dy, length: Math.hypot(dx, dy) * cell }))

/**
 * The cheapest way over the grid from one point to another, as the point
 * each point was reached from, and nothing where there is no way. A point
 * is dearer to pass the less room it has; the ends cost nothing more,
 * whatever room they have.
 */
const searched = ({ columns, rows }: Field, rooms: Float64Array, start: number, goal: number): Int32Array | undefined => {
    const size = columns * rows
    const price = rooms.map(priceOf)
    price[start] = 1
    price[goal] = 1

    const goalColumn = goal % columns
    const goalRow = Math.floor(goal / columns)
    const guess = (column: number, row: number) => cell * Math.hypot(goalColumn - column, goalRow - row)

    const cost = new Float64Array(size).fill(Infinity)
    const cameFrom = new Int32Array(size).fill(-1)
    const done = new Uint8Array(size)
    const frontier = frontierOf()
    cost[start] = 0
    frontier.push(start, 0)

    for (let current = frontier.pop(); current !== undefined; current = frontier.pop()) {
        if (current === goal) return cameFrom
        if (done[current]) continue
        done[current] = 1

        const column = current % columns
        const row = Math.floor(current / columns)
        const here = cost[current] ?? Infinity
        const priceHere = price[current] ?? Infinity
        for (const { dx, dy, length } of steps) {
            const x = column + dx
            const y = row + dy
            if (x < 0 || y < 0 || x >= columns || y >= rows) continue

            // A step costs what the dearest point it touches costs, so that
            // a diagonal one does not slip between two that are crowded.
            const next = y * columns + x
            const dearest = Math.max(
                priceHere,
                price[next] ?? Infinity,
                price[row * columns + x] ?? Infinity,
                price[y * columns + column] ?? Infinity
            )
            const reached = here + length * dearest
            if (reached >= (cost[next] ?? Infinity)) continue

            cost[next] = reached
            cameFrom[next] = current
            frontier.push(next, reached + guess(x, y))
        }
    }
    return undefined
}

/** Whether the straight way between two places keeps, all along it, the room asked for at each share of the way. */
const keepsRoom = (a: Pt, b: Pt, room: (p: Pt) => number, needed: (share: number) => number) => {
    const samples = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (cell / 2))
    for (let s = 1; s < samples; s++) {
        const t = s / samples
        if (room({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }) < needed(t)) return false
    }
    return true
}

/**
 * The places of a route where it turns, everything it passes straight
 * through left out. A short cut keeps as much room as the stretch of the
 * route it cuts, or the comfort where that had more.
 */
const pulledTaut = (path: readonly Pt[], room: (p: Pt) => number): Pt[] => {
    const rooms = path.map(room)
    const cutsShort = (i: number, j: number) => {
        const a = path[i]
        const b = path[j]
        return a !== undefined && b !== undefined &&
            keepsRoom(a, b, room, t => Math.min(comfort, rooms[Math.round(i + t * (j - i))] ?? 0))
    }

    const [first] = path
    if (!first) return []

    const taut = [first]
    for (let i = 0; i < path.length - 1;) {
        let j = i + 1
        while (j + 1 < path.length && cutsShort(i, j + 1)) j++
        const next = path[j]
        if (next) taut.push(next)
        i = j
    }
    return taut
}

/**
 * The route without the kinks the grid leaves in it: a turn that barely
 * leaves the straight between its neighbours goes, where the straight
 * keeps the clearance.
 */
const unkinked = (route: readonly Pt[], room: (p: Pt) => number): Pt[] => {
    const kept = [...route]
    for (let i = 1; i < kept.length - 1;) {
        const [before, at, after] = [kept[i - 1], kept[i], kept[i + 1]]
        const kink = before && at && after &&
            distanceToSegment(at, before, after) < cell &&
            keepsRoom(before, after, room, () => clearance)
        if (kink) kept.splice(i, 1)
        else i++
    }
    return kept
}

/**
 * The way from one version to another round everything in between: the
 * places it turns at, beginning and ending at the versions. It keeps the
 * clearance from every obstacle and the comfort where it can, and goes
 * straight where nothing is in its way. Where nothing leaves it a way
 * round, it crosses where the crossing is shortest.
 */
export const routeAround = (
    from: End,
    to: End,
    obstacles: readonly Obstacle[],
    field: Field = fieldOf(obstacles, [from.at, to.at])
): Point[] => {
    const straight = [from.at, to.at]
    const room = roomFinder(obstacles, [from, to])
    const placeOf = (c: number) => placeIn(field, c)

    const start = cellIn(field, from.at)
    const goal = cellIn(field, to.at)
    if (start === undefined || goal === undefined) return straight

    // Only near its ends does a route find more room than the field
    // holds, where their own obstacles give way to it.
    const rooms = field.rooms.slice()
    for (const end of [from, to]) {
        for (const c of cellsAround(field, end.at, end.reach + cell)) rooms[c] = room(placeOf(c))
    }

    const cameFrom = searched(field, rooms, start, goal)
    if (!cameFrom) return straight

    // Walked back from the goal, the ends themselves left for the exact places of the versions.
    const between = []
    for (let c = cameFrom[goal] ?? -1; c !== -1 && c !== start; c = cameFrom[c] ?? -1) between.push(placeOf(c))

    const path = [from.at, ...between.reverse(), to.at]
    return unkinked(pulledTaut(path, room), room).map(p => point(svg(p.x), svg(p.y)))
}

/** The place halfway along a route, measured along it, and which way the route runs there. */
export const halfwayAlong = (route: readonly Point[]): { at: Point, direction: Point } | undefined => {
    const legs = route.slice(1).map((to, i) => {
        const from = route[i] ?? to
        return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) }
    })
    const total = legs.reduce((sum, leg) => sum + leg.length, 0)

    let left = total / 2
    for (const leg of legs) {
        if (left <= leg.length && leg.length > 0) {
            const t = left / leg.length
            return {
                at: point(svg(leg.from.x + t * (leg.to.x - leg.from.x)), svg(leg.from.y + t * (leg.to.y - leg.from.y))),
                direction: point(svg(leg.to.x - leg.from.x), svg(leg.to.y - leg.from.y))
            }
        }
        left -= leg.length
    }

    const [first] = route
    return first && { at: first, direction: point(svg(0), svg(0)) }
}
