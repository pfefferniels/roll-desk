import { max, min, subtract } from 'linked-rolls'
import { Box, Point } from './drawing'

/** The least box containing every one of the points. */
export const getBoundingBox = (points: Point[]): Box => {
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)

    const left = xs.reduce(min)
    const top = ys.reduce(min)

    return {
        x: left,
        y: top,
        width: subtract(xs.reduce(max), left),
        height: subtract(ys.reduce(max), top)
    }
}
