import { add, scale, subtract } from 'linked-rolls'
import { Svg, svg } from './units'

/** A place on the drawing, and equally a vector between two of them. */
export interface Point {
    x: Svg
    y: Svg
}

export const point = (x: Svg, y: Svg): Point => ({ x, y })

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
export const perpendicular = ({ x, y }: Point): Point => point(svg(-y), x)
