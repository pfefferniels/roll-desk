import { calibrationOf, RollCopy, TrackCalibration } from "linked-rolls"
import { copyLabel, whichCopy } from "./names"

/**
 * The drawing counts a scan's columns from the bass edge upwards, the
 * way the tracker bar numbers its tracks. A calibration whose columns
 * fall as the tracks rise describes a roll that lay the other way round
 * in the scanner: the column runs it gives then descend, and the strips
 * of the facsimile would be drawn inside out. Neither reader produces
 * such a calibration, and no dialog lets one be typed.
 */
const columnsRunWithTracks = (calibration: TrackCalibration): boolean =>
    calibration.separation > 0

/** The calibration a copy's scan is drawn by, or nothing if it cannot be drawn. */
export const drawableCalibrationOf = (copy: RollCopy): TrackCalibration | undefined => {
    const calibration = calibrationOf(copy)
    return calibration && columnsRunWithTracks(calibration) ? calibration : undefined
}

/** A copy that states a scan and a calibration the drawing cannot follow. */
const scanRunsBackwards = (copy: RollCopy): boolean => {
    const calibration = calibrationOf(copy)
    return copy.scan !== undefined && calibration !== undefined && !columnsRunWithTracks(calibration)
}

/**
 * Why some copies are left without their scan, or nothing if all of them
 * can be drawn. A document stating such a calibration was written
 * somewhere other than here.
 */
export const refusalToDrawScans = (copies: readonly RollCopy[]): string | undefined => {
    const refused = copies.filter(scanRunsBackwards)
    const [first, ...others] = refused
    if (!first) return undefined

    return others.length === 0
        ? `The scan of the copy ${whichCopy(first)} counts its columns against the tracks, so it is not drawn.`
        : `The scans of the copies ${refused.map(copyLabel).join(', ')} count their columns against the tracks, so they are not drawn.`
}
