import { add, distance, max, min, scale, subtract } from 'linked-rolls'
import { along, apart, Box, minus, perpendicular, plus, Point, point, times, unit } from './drawing'
import { Degrees, degrees, Svg, svg } from './units'

export type { Point }

/** What an arrow joins: the box a feature or symbol is drawn in. */
export type Boxed = Box

/** The curve an arrow takes, and where its head sits and which way it points. */
export interface ArrowLine {
    /** The path of the shaft, stopping short of the tip by the head's length. */
    d: string

    /** The tip, which is the edge of the thing being pointed at. */
    head: Point

    /** Which way the head points, as an SVG rotation. */
    angle: Degrees
}

/**
 * How far an arrow bows out of the straight, as a fraction of its
 * length, so that a short one and a long one read as the same gesture.
 */
const BOW = 0.2

/** The most any arrow bows, so that a long one does not swing across the roll. */
const MAX_BOW = svg(22)

/** The length of the head, which the shaft stops short by. */
const HEAD = svg(9)

/** Half the width of the head at its base, against its length. */
const HEAD_SPREAD = 0.42

/** The air left between an arrow and the commands it runs between. */
const GAP = svg(3)

/**
 * The shortest an arrow is drawn. Below this the two ends are the same
 * place, which happens whenever a command was replaced without moving:
 * a red Mezzoforte pair and the green hold that stands for it sit in the
 * same lane over the same stretch of roll.
 */
export const LEAST_LENGTH = svg(30)

/**
 * The least a command must have moved along the roll for the arrow to be
 * drawn as a move. Below this the old onset and the new one are one
 * place on the drawing at this zoom, and nothing readable runs between
 * them.
 */
const LEAST_MOVE = svg(2)

/** The lean of an arrow that has nowhere to come from, three parts down to two across. */
const LEAN = Math.PI / 3

export const centreOf = (box: Boxed): Point =>
    point(add(box.x, scale(box.width, 0.5)), add(box.y, scale(box.height, 0.5)))

/**
 * Where a ray from the middle of a box towards a point leaves it.
 *
 * An arrow stops at the edge of what it joins rather than at the middle,
 * so that its head arrives at a command instead of being buried in
 * it.
 */
const edgeTowards = (box: Boxed, target: Point): Point => {
    const middle = centreOf(box)
    const towards = minus(target, middle)
    if (towards.x === 0 && towards.y === 0) return middle

    const reach = Math.min(
        towards.x === 0 ? Infinity : (box.width / 2) / Math.abs(towards.x),
        towards.y === 0 ? Infinity : (box.height / 2) / Math.abs(towards.y)
    )
    return along(middle, towards, reach)
}

const stepped = (from: Point, towards: Point, by: Svg): Point => {
    const direction = unit(minus(towards, from))
    return direction ? along(from, direction, by) : from
}

/**
 * Where an arrow with nowhere to come from starts and ends: down and
 * across into the top of what it points at, so that it reads as an
 * arrow beside a long command rather than as a spike on it.
 */
const stub = (to: Boxed): { start: Point, tip: Point } => {
    const tip = point(centreOf(to).x, subtract(to.y, GAP))
    return {
        start: point(
            subtract(tip.x, scale(LEAST_LENGTH, Math.cos(LEAN))),
            subtract(tip.y, scale(LEAST_LENGTH, Math.sin(LEAN)))
        ),
        tip
    }
}

/** Whether the arrow between the two edges would double back on itself. */
const doublesBack = (start: Point, tip: Point, from: Point, to: Point): boolean =>
    (tip.x - start.x) * (to.x - from.x) + (tip.y - start.y) * (to.y - from.y) <= 0

/** The arrow given its three points, the shaft stopping short of the tip by the head. */
const curved = (start: Point, control: Point, tip: Point): ArrowLine => {
    const angle = Math.atan2(tip.y - control.y, tip.x - control.x)
    const shaftEnd = point(
        subtract(tip.x, svg(Math.cos(angle) * HEAD)),
        subtract(tip.y, svg(Math.sin(angle) * HEAD))
    )

    return {
        d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${shaftEnd.x} ${shaftEnd.y}`,
        head: tip,
        angle: degrees(angle * 180 / Math.PI)
    }
}

/** Whether the two are drawn in one and the same lane. */
const inOneLane = (from: Boxed, to: Boxed): boolean =>
    from.y === to.y && from.height === to.height

/**
 * Whether the edit moved its command along the roll: the lane it is read
 * on is the one it was read on before, and the two onsets are far enough
 * apart on the drawing to be told apart.
 */
const movedAlongTheRoll = (from: Boxed, to: Boxed): boolean =>
    inOneLane(from, to) && distance(from.x, to.x) >= LEAST_MOVE

/** The onset of a command with a little air under it, which is where a move is drawn from. */
const under = (box: Boxed): Point => point(box.x, add(add(box.y, box.height), GAP))

/**
 * How deep an arrow hangs under the lane: some of the same bow whatever
 * the move, and, where the move is too short to give the arrow a length
 * of its own, as much as the arrow needs to be seen and hit.
 */
const dipOf = (span: Svg): Svg => max(
    min(scale(span, BOW), MAX_BOW),
    svg(Math.sqrt(Math.max(0, LEAST_LENGTH ** 2 - span ** 2)))
)

/**
 * The arrow for a command that kept its lane and only moved along the
 * roll: out from under the old onset, under the lane, and back up into
 * the new one.
 *
 * It joins the onsets rather than the boxes, since what such an edit
 * says is that this began there and begins here now, and it runs under
 * the lane rather than in it, where it would lie over the very
 * perforations it is about.
 */
const alongTheRoll = (from: Boxed, to: Boxed): ArrowLine => {
    const start = under(from)
    const tip = under(to)
    const middle = times(plus(start, tip), 0.5)
    const control = point(middle.x, add(middle.y, dipOf(distance(start.x, tip.x))))

    return curved(start, control, tip)
}

/**
 * The arrow for one thing put in the place of another, which on a
 * transfer between systems is a command repunched in another lane.
 *
 * It holds up wherever the two fall: far apart or lying over each other,
 * across the paper or along it, in either direction. Each end stops at
 * the edge of its box with a little air, so the head arrives at a
 * command rather than inside it, and every arrow keeps some of the
 * same bow whatever its length, so that a straight one is not taken for
 * a command. Where the two are so nearly one place that no arrow
 * between them could be read, one is drawn into the second from above.
 */
const intoThePlaceOf = (from: Boxed, to: Boxed): ArrowLine => {
    const fromMiddle = centreOf(from)
    const toMiddle = centreOf(to)

    const onEdge = {
        start: stepped(edgeTowards(from, toMiddle), toMiddle, GAP),
        tip: stepped(edgeTowards(to, fromMiddle), fromMiddle, GAP)
    }

    const usable = apart(onEdge.start, onEdge.tip) >= LEAST_LENGTH
        && !doublesBack(onEdge.start, onEdge.tip, fromMiddle, toMiddle)

    const { start, tip } = usable ? onEdge : stub(to)

    const shaft = minus(tip, start)
    const bow = min(scale(apart(start, tip), BOW), MAX_BOW)
    const sideways = unit(perpendicular(shaft))
    const middle = times(plus(start, tip), 0.5)

    return curved(start, sideways ? along(middle, sideways, bow) : middle, tip)
}

/**
 * The arrow from one thing on the roll to another, saying that the
 * first became the second.
 *
 * Which of the two it draws is read off where the two are drawn. A
 * command still on its own lane was moved along the paper, and the
 * arrow runs from the old onset to the new one, as it does for a shift.
 * Anything else took the place of what it replaced, lane and all, which
 * is what a repunching for another system does, and there the arrow
 * joins the two where they stand.
 */
export const arrowLine = (from: Boxed, to: Boxed): ArrowLine =>
    movedAlongTheRoll(from, to) ? alongTheRoll(from, to) : intoThePlaceOf(from, to)

/** The head, as a triangle whose tip is the origin and which points along +x. */
export const headPoints = (): string => {
    const back = scale(HEAD, -1)
    const spread = scale(HEAD, HEAD_SPREAD)
    return `0,0 ${back},${scale(spread, -1)} ${back},${spread}`
}
