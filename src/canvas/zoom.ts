import type { ZoomRange } from "./useLiveZoom"
import { svgPerMm } from "./units"

/**
 * How far the roll may be stretched, in SVG units per millimetre. The
 * scans are taken at about 300 dpi, so at the top of the range a scan
 * pixel is roughly an SVG unit and nothing is drawn finer than it was
 * measured. That is also where the ruler's step falls under a centimetre
 * and its readings turn to millimetres, see `ruler`.
 */
export const zoomRange: ZoomRange = { min: svgPerMm(0.1), max: svgPerMm(12) }
