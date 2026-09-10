export interface Point {
    x: number
    y: number
}

export interface Boxed {
    x: number
    y: number
    width: number
    height: number
}

/** The curve an arrow takes, and where its head sits and which way it points. */
export interface ArrowLine {
    /** The path of the shaft, stopping short of the tip by the head's length. */
    d: string

    /** The tip, which is the edge of the thing being pointed at. */
    head: Point

    /** Which way the head points, in degrees, as an SVG rotation. */
    angle: number
}

/**
 * How far an arrow bows out of the straight, as a fraction of its
 * length, so that a short one and a long one read as the same gesture.
 */
const BOW = 0.2

/** The most any arrow bows, so that a long one does not swing across the roll. */
const MAX_BOW = 22

/** The length of the head, which the shaft stops short by. */
const HEAD = 9

/** Half the width of the head at its base, against its length. */
const HEAD_SPREAD = 0.42

/** The air left between an arrow and the perforations it runs between. */
const GAP = 3

/**
 * The shortest an arrow is drawn. Below this the two ends are the same
 * place, which happens whenever a command was replaced without moving:
 * a red Mezzoforte pair and the green hold that stands for it sit in the
 * same lane over the same stretch of roll.
 */
export const LEAST_LENGTH = 30

/** The lean of an arrow that has nowhere to come from, three parts down to two across. */
const LEAN = Math.PI / 3

export const centreOf = (box: Boxed): Point =>
    ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

const distance = (from: Point, to: Point): number =>
    Math.hypot(to.x - from.x, to.y - from.y)

/**
 * Where a ray from the middle of a box towards a point leaves it.
 *
 * An arrow stops at the edge of what it joins rather than at the middle,
 * so that its head arrives at a perforation instead of being buried in
 * it.
 */
const edgeTowards = (box: Boxed, target: Point): Point => {
    const middle = centreOf(box)
    const run = target.x - middle.x
    const rise = target.y - middle.y
    if (run === 0 && rise === 0) return middle

    const reach = Math.min(
        run === 0 ? Infinity : (box.width / 2) / Math.abs(run),
        rise === 0 ? Infinity : (box.height / 2) / Math.abs(rise)
    )
    return { x: middle.x + run * reach, y: middle.y + rise * reach }
}

const stepped = (from: Point, towards: Point, by: number): Point => {
    const length = distance(from, towards)
    if (length === 0) return from
    return {
        x: from.x + ((towards.x - from.x) / length) * by,
        y: from.y + ((towards.y - from.y) / length) * by
    }
}

/**
 * Where an arrow with nowhere to come from starts and ends: down and
 * across into the top of what it points at, so that it reads as an
 * arrow beside a long perforation rather than as a spike on it.
 */
const stub = (to: Boxed): { start: Point, tip: Point } => {
    const tip = { x: centreOf(to).x, y: to.y - GAP }
    return {
        start: {
            x: tip.x - LEAST_LENGTH * Math.cos(LEAN),
            y: tip.y - LEAST_LENGTH * Math.sin(LEAN)
        },
        tip
    }
}

/** Whether the arrow between the two edges would double back on itself. */
const doublesBack = (start: Point, tip: Point, from: Point, to: Point): boolean =>
    (tip.x - start.x) * (to.x - from.x) + (tip.y - start.y) * (to.y - from.y) <= 0

/**
 * The arrow from one thing on the roll to another, saying that the
 * first became the second.
 *
 * It holds up wherever the two fall: far apart or lying over each other,
 * across the paper or along it, in either direction. Each end stops at
 * the edge of its box with a little air, so the head arrives at a
 * perforation rather than inside it, and every arrow keeps some of the
 * same bow whatever its length, so that a straight one is not taken for
 * a perforation. Where the two are so nearly one place that no arrow
 * between them could be read, one is drawn into the second from above.
 */
export const arrowLine = (from: Boxed, to: Boxed): ArrowLine => {
    const fromMiddle = centreOf(from)
    const toMiddle = centreOf(to)

    const onEdge = {
        start: stepped(edgeTowards(from, toMiddle), toMiddle, GAP),
        tip: stepped(edgeTowards(to, fromMiddle), fromMiddle, GAP)
    }

    const usable = distance(onEdge.start, onEdge.tip) >= LEAST_LENGTH
        && !doublesBack(onEdge.start, onEdge.tip, fromMiddle, toMiddle)

    const { start, tip } = usable ? onEdge : stub(to)

    const run = tip.x - start.x
    const rise = tip.y - start.y
    const length = Math.hypot(run, rise)

    const bow = Math.min(length * BOW, MAX_BOW)
    const control = {
        x: (start.x + tip.x) / 2 - (rise / length) * bow,
        y: (start.y + tip.y) / 2 + (run / length) * bow
    }

    const angle = Math.atan2(tip.y - control.y, tip.x - control.x)
    const shaftEnd = {
        x: tip.x - Math.cos(angle) * HEAD,
        y: tip.y - Math.sin(angle) * HEAD
    }

    return {
        d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${shaftEnd.x} ${shaftEnd.y}`,
        head: tip,
        angle: angle * 180 / Math.PI
    }
}

/** The head, as a triangle whose tip is the origin and which points along +x. */
export const headPoints = (): string =>
    `0,0 ${-HEAD},${-HEAD * HEAD_SPREAD} ${-HEAD},${HEAD * HEAD_SPREAD}`
