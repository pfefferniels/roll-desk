import { calibrationOf, RollCopy, TrackCalibration } from "linked-rolls"

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

const heldBy = (copy: RollCopy): string => copy.keeper.name.trim() || 'an unnamed keeper'

/**
 * Why some copies are left without their scan, or nothing if all of them
 * can be drawn. A document stating such a calibration was written
 * somewhere other than here.
 */
export const refusalToDrawScans = (copies: readonly RollCopy[]): string | undefined => {
    const keepers = copies.filter(scanRunsBackwards).map(heldBy)
    if (keepers.length === 0) return undefined

    return keepers.length === 1
        ? `The scan of the copy held by ${keepers[0]} counts its columns against the tracks, so it is not drawn.`
        : `The scans of the copies held by ${keepers.join(', ')} count their columns against the tracks, so they are not drawn.`
}
