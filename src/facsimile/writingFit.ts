/** A box as `getBBox` measures it, in the units of the drawing. */
export interface Extent {
    x: number
    y: number
    width: number
    height: number
}

type Size = Pick<Extent, 'width' | 'height'>

/** How wide and how tall a box stands on the drawing once it is turned by the angle, in degrees. */
export const turned = ({ width, height }: Size, angle: number): Size => {
    const radians = angle * Math.PI / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))
    return { width: width * cos + height * sin, height: width * sin + height * cos }
}

/** The least and the most a writing is scaled, so that it neither vanishes nor swells past reading. */
export const scaleLimits = { least: 0.25, most: 4 } as const

/**
 * How far a text is scaled, the same both ways, to fill the room it is
 * given once it is turned by the angle: a writing across the roll has its
 * lines run along the room's height, which the lanes fix, and its width
 * is what the zoom stretches. Within the limits, so that at a zoom far
 * out it runs over its box rather than shrinking out of sight.
 */
export const fittingScale = (text: Size, room: Size, angle: number): number => {
    const { width, height } = turned(text, angle)
    if (width <= 0 || height <= 0) return 1

    const fits = Math.min(room.width / width, room.height / height)
    return Math.min(scaleLimits.most, Math.max(scaleLimits.least, fits))
}
