import { Millimeters, mm, Quantity, quantity } from 'linked-rolls'

/**
 * A length on the drawing. No SVG on the desk carries a viewBox, so one
 * drawing unit is one CSS pixel, and a viewport's `scrollLeft` and
 * `clientWidth` are measured in these too. The exception is a running
 * zoom gesture, which rides a `scale()` on the stage and leaves the two
 * apart until it settles, see `useLiveZoom`.
 */
export type Svg = Quantity<'svg'>
export const svg = quantity<'svg'>

/** How far the roll is stretched: drawing units per millimetre. */
export type SvgPerMm = Quantity<'svg/mm'>
export const svgPerMm = quantity<'svg/mm'>

/** How a scan is laid along the roll: drawing units per scan pixel. */
export type SvgPerScanPixel = Quantity<'svg/px'>
export const svgPerScanPixel = quantity<'svg/px'>

/**
 * A place in a tile as it was fetched. A tile is asked for at a scale
 * factor, so its own pixels are coarser than the scan's by that factor.
 */
export type TilePixels = Quantity<'tile-px'>
export const tilePixels = quantity<'tile-px'>

export type SvgPerTilePixel = Quantity<'svg/tile-px'>
export const svgPerTilePixel = quantity<'svg/tile-px'>

/**
 * How far a count of pixels reaches on the drawing. The unit of the rate
 * decides which pixels are meant, so a scan's and a tile's cannot be
 * measured against each other's.
 */
export const reachOf = <U extends string>(per: Quantity<`svg/${U}`>, pixels: Quantity<NoInfer<U>>): Svg =>
    svg(per * pixels)

/**
 * Where a reading stands on the zoom slider's track, which is measured
 * in marks rather than in zoom, see `zoomAt`.
 */
export type Mark = Quantity<'mark'>
export const mark = quantity<'mark'>

/** An angle, as an SVG rotation states it. */
export type Degrees = Quantity<'deg'>
export const degrees = quantity<'deg'>

/** Where a place on the paper is drawn. */
export const drawnAt = (place: Millimeters, zoom: SvgPerMm): Svg => svg(place * zoom)

/** Where a place on the drawing falls on the paper. */
export const placeAt = (x: Svg, zoom: SvgPerMm): Millimeters => mm(x / zoom)
