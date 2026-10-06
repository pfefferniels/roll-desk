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

/** How much one press of a zoom key stretches or shrinks the roll, as much as a notch of the wheel at most. */
const keyStep = 1.5

/**
 * How far a key stretches the roll: + out by half again, and = with it,
 * where + takes the shift key; - back by as much. Nothing for any other
 * key, nor where Control, Command or Alt is held, which makes the key
 * the browser's own zoom or someone else's shortcut.
 */
export const keyZoomFactor = (
    { key, ctrlKey, metaKey, altKey }: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>
): number | undefined => {
    if (ctrlKey || metaKey || altKey) return undefined
    if (key === '+' || key === '=') return keyStep
    if (key === '-') return 1 / keyStep
    return undefined
}
