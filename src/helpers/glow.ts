import { Svg, svg } from './units'

/** A halo around a shape, in the shape's own colour, deepened so that it carries at a distance. */
export interface Glow {
    colour: string
    reach: Svg
}

/** How far the glow reaches around a shape wide enough to stand on its own. */
const restingReach = svg(2.5)

/** The width a shape keeps on the drawing however far the roll is shrunk. */
const smallestFootprint = svg(18)

/**
 * How far the glow reaches around a shape drawn this wide.
 *
 * The roll is stretched horizontally alone, so zooming out leaves an edit
 * covering a few millimetres of paper thinner than a line and it is lost
 * among the punches. The glow makes up what the roll no longer gives it,
 * which keeps every edit at a footprint the eye can find at any zoom.
 * Where the shape is wide enough there is nothing to make up, and the
 * glow stays a hair's breadth around it.
 */
export const glowReach = (width: Svg): Svg =>
    svg(Math.max(restingReach, (smallestFootprint - width) / 2))

/**
 * How plainly a shape's own outline is drawn at that width. A shape too
 * narrow to have an inside reads as a black speck if it keeps its
 * outline, so the outline gives way as the glow takes over.
 */
export const outlineStrength = (width: Svg): number =>
    Math.min(1, width / smallestFootprint)

/** The rings the glow is drawn as, widest and faintest first. */
export const glowRings: readonly { spread: number, opacity: number }[] = [
    { spread: 1, opacity: 0.22 },
    { spread: 0.5, opacity: 0.4 }
]

/** How a shape moves between one look and the next, short enough to read as one movement. */
export const settling = [
    'stroke-width 180ms ease-out',
    'stroke-opacity 180ms ease-out',
    'fill-opacity 180ms ease-out',
    'opacity 180ms ease-out'
].join(', ')
