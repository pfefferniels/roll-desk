import { Millimeters } from "linked-rolls"
import { placeAt, Svg, svg, SvgPerMm } from "./units"
import { Point } from "../geometry/drawing"

export interface RollPoint {
    /** Along the roll. */
    x: Millimeters

    /** Across the roll, in the units the lanes are laid out in. */
    y: Svg
}

/**
 * Where a pointer sits on the roll. It goes through the element's own
 * screen matrix rather than its bounding box, so it stays right
 * whatever transform the zoom stage happens to carry while a gesture
 * is running.
 */
export const rollPointAt = (
    element: SVGGraphicsElement,
    event: Pick<MouseEvent, 'clientX' | 'clientY'>,
    zoom: SvgPerMm
): RollPoint | undefined => {
    const point = drawnPointAt(element, event)
    return point && { x: placeAt(point.x, zoom), y: point.y }
}

/** Where a pointer sits in the element's own drawing units, through its screen matrix as above. */
export const drawnPointAt = (
    element: SVGGraphicsElement,
    { clientX, clientY }: Pick<MouseEvent, 'clientX' | 'clientY'>
): Point | undefined => {
    const matrix = element.getScreenCTM()
    if (!matrix) return undefined

    const { x, y } = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
    return { x: svg(x), y: svg(y) }
}
