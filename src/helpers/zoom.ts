import type { ZoomRange } from "../hooks/useLiveZoom"

/**
 * How far the roll may be stretched, in SVG units per millimetre. The
 * scans are taken at about 300 dpi, so at the top of the range a scan
 * pixel is roughly an SVG unit and nothing is drawn finer than it was
 * measured. That is also where the ruler's step falls under a centimetre
 * and its readings turn to millimetres, see `ruler`.
 */
export const zoomRange: ZoomRange = { min: 0.1, max: 12 }

/** The zooms the slider marks, its ends among them. */
export const zoomMarks = [zoomRange.min, 0.25, 0.5, 1, 2, 4, zoomRange.max]

/**
 * The slider's track is measured in marks: a whole position is the marked
 * zoom itself, and between two marks the zoom grows geometrically, so that
 * the five doublings from 25 % to 400 % take the same distance. Both ends
 * of the track are whole numbers, so they lie on the grid a range input
 * counts out in steps from its minimum, and the top of the slider is
 * `zoomRange.max` itself.
 */
export const zoomAt = (position: number) => {
    const passed = Math.floor(position)
    const from = zoomMarks[passed]
    const to = zoomMarks[Math.ceil(position)]

    return from * (to / from) ** (position - passed)
}

/** Where a zoom stands on the track, so that the thumb follows a zoom set elsewhere. */
export const positionOf = (zoom: number) => {
    const onTrack = Math.min(zoomRange.max, Math.max(zoomRange.min, zoom))

    // Never the first mark, so that a step always lies below.
    const above = Math.max(1, zoomMarks.findIndex(mark => mark >= onTrack))
    const below = above - 1

    return below + Math.log(onTrack / zoomMarks[below]) / Math.log(zoomMarks[above] / zoomMarks[below])
}
