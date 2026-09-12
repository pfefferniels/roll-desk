import { clamp } from "linked-rolls"
import type { ZoomRange } from "../hooks/useLiveZoom"
import { Mark, mark, SvgPerMm, svgPerMm } from "./units"

/**
 * How far the roll may be stretched, in SVG units per millimetre. The
 * scans are taken at about 300 dpi, so at the top of the range a scan
 * pixel is roughly an SVG unit and nothing is drawn finer than it was
 * measured. That is also where the ruler's step falls under a centimetre
 * and its readings turn to millimetres, see `ruler`.
 */
export const zoomRange: ZoomRange = { min: svgPerMm(0.1), max: svgPerMm(12) }

/** The zooms the slider marks, its ends among them. */
export const zoomMarks: SvgPerMm[] = [zoomRange.min, 0.25, 0.5, 1, 2, 4, zoomRange.max].map(svgPerMm)

const lastMark = zoomMarks.length - 1

/** The zoom a mark of the track stands at, its ends answering for anything beyond them. */
const markAt = (index: number): SvgPerMm =>
    zoomMarks[Math.min(lastMark, Math.max(0, index))] ?? zoomRange.max

/**
 * The slider's track is measured in marks: a whole position is the marked
 * zoom itself, and between two marks the zoom grows geometrically, so that
 * the five doublings from 25 % to 400 % take the same distance. Both ends
 * of the track are whole numbers, so they lie on the grid a range input
 * counts out in steps from its minimum, and the top of the slider is
 * `zoomRange.max` itself.
 */
export const zoomAt = (position: Mark): SvgPerMm => {
    const passed = Math.floor(position)
    const from = markAt(passed)
    const to = markAt(Math.ceil(position))

    return svgPerMm(from * (to / from) ** (position - passed))
}

/** Where a zoom stands on the track, so that the thumb follows a zoom set elsewhere. */
export const positionOf = (zoom: SvgPerMm): Mark => {
    const onTrack = clamp(zoom, zoomRange.min, zoomRange.max)

    // Never the first mark, so that a step always lies below.
    const above = Math.max(1, zoomMarks.findIndex(marked => marked >= onTrack))
    const foot = markAt(above - 1)
    const head = markAt(above)

    return mark(above - 1 + Math.log(onTrack / foot) / Math.log(head / foot))
}
