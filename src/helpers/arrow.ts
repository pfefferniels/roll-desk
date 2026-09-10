export interface Point {
    x: number
    y: number
}

/** The curve an arrow takes, and where its head sits and which way it points. */
export interface ArrowLine {
    /** The path of the shaft, stopping short of the tip by the head's length. */
    d: string

    /** The tip, which is the place being pointed at. */
    head: Point

    /** Which way the head points, in degrees, as an SVG rotation. */
    angle: number
}

/**
 * How far an arrow bows out of the straight, as a fraction of its
 * length, so that a short one and a long one read as the same gesture.
 */
const BOW = 0.28

/** The most any arrow bows, so that a long one does not swing across the roll. */
const MAX_BOW = 26

/** The length of the head, which the shaft stops short by. */
const HEAD = 5

/**
 * The shortest an arrow is drawn. Below this the two ends are the same
 * place, which happens whenever a command was replaced without moving:
 * a red Mezzoforte pair and the green hold that stands for it sit in the
 * same lane over the same stretch of roll. The arrow is then given a
 * length of its own so that the edit can still be seen and clicked.
 */
export const LEAST_LENGTH = 24

const lengthOf = (from: Point, to: Point): number =>
    Math.hypot(to.x - from.x, to.y - from.y)

/**
 * Down and slightly across into the target, for an arrow whose ends are
 * one place. It comes in at a lean rather than straight down so that it
 * reads as an arrow beside a long perforation instead of as a tick on it.
 */
const LEAN = Math.PI / 3

const stubStart = (to: Point): Point => ({
    x: to.x - LEAST_LENGTH * Math.cos(LEAN),
    y: to.y - LEAST_LENGTH * Math.sin(LEAN)
})

/**
 * The arrow from one place on the roll to another.
 *
 * It holds up wherever the two ends fall: far apart or on top of each
 * other, across the paper or along it, in either direction. A straight
 * line between two lanes is easily taken for a perforation, so every
 * arrow keeps a little of the same bow whatever its length, and one
 * whose ends coincide is given a length rather than drawn as a dot.
 */
export const arrowLine = (from: Point, to: Point): ArrowLine => {
    const start = lengthOf(from, to) >= LEAST_LENGTH ? from : stubStart(to)

    const run = to.x - start.x
    const rise = to.y - start.y
    const length = Math.hypot(run, rise)

    const bow = Math.min(length * BOW, MAX_BOW)
    const control = {
        x: (start.x + to.x) / 2 - (rise / length) * bow,
        y: (start.y + to.y) / 2 + (run / length) * bow
    }

    const angle = Math.atan2(to.y - control.y, to.x - control.x)
    const shaftEnd = {
        x: to.x - Math.cos(angle) * HEAD,
        y: to.y - Math.sin(angle) * HEAD
    }

    return {
        d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${shaftEnd.x} ${shaftEnd.y}`,
        head: to,
        angle: angle * 180 / Math.PI
    }
}

/** The head, as a triangle whose tip is the origin and which points along +x. */
export const headPoints = (): string => `0,0 ${-HEAD},${-HEAD * 0.6} ${-HEAD},${HEAD * 0.6}`

/** The middle of a box, which is where an arrow leaves it from or arrives at. */
export const centreOf = (box: { x: number, y: number, width: number, height: number }): Point =>
    ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })
