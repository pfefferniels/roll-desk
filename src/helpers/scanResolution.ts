import { inMillimeters, Millimeters, Pixels, px } from "linked-rolls"

/**
 * The resolution the scans were read at. A reader turns a scan into
 * millimetres as it reads it and keeps no record of what it divided by,
 * so everything that goes back to the scan's own pixels has to assume
 * the same resolution again.
 */
const scanDpi = 300.25

const millimetersPerInch = 25.4

/** Where a place in a scan falls on the paper. */
export const onPaper = (place: Pixels): Millimeters => inMillimeters(place, scanDpi)

/** Where a place on the paper falls in the scan it was read from. */
export const inScan = (place: Millimeters): Pixels => px(place / millimetersPerInch * scanDpi)
