/**
 * Where a pointer sits on the roll, in millimetres. It goes through the
 * element's own screen matrix rather than its bounding box, so it stays
 * right whatever transform the zoom stage happens to carry while a
 * gesture is running.
 */
export const rollXAt = (
    element: SVGGraphicsElement,
    clientX: number,
    zoom: number
): number | undefined => {
    const matrix = element.getScreenCTM()
    if (!matrix) return undefined

    const point = new DOMPoint(clientX, 0).matrixTransform(matrix.inverse())
    return point.x / zoom
}
