import {
    inMillimeters,
    inPixels,
    Millimeters,
    Pixels,
    pixelsPerInch,
    Resolution,
    RollCopy
} from "linked-rolls"

/**
 * The resolution the Stanford scans were read at. A copy that states
 * none of its own is read against this, on the assumption that it was
 * scanned the same way.
 */
const assumedResolution = pixelsPerInch(300.25)

const resolutionOf = (copy: RollCopy): Resolution =>
    copy.measurements.scanResolution?.value ?? assumedResolution

/** Where a place in a copy's scan falls on the paper. */
export const onPaper = (place: Pixels, copy: RollCopy): Millimeters =>
    inMillimeters(place, resolutionOf(copy))

/** Where a place on the paper falls in the scan the copy was read from. */
export const inScan = (place: Millimeters, copy: RollCopy): Pixels =>
    inPixels(place, resolutionOf(copy))
