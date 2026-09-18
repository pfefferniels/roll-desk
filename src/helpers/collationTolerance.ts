import {
    BothEnds, CollationTolerance, collationToleranceOf, defaultCollationTolerance, Millimeters, mm,
    offsetEndOf, offsetStartOf, principalDerivationOf, Version
} from "linked-rolls"

/**
 * The tolerance the version's principal derivation was collated at, or the
 * library's default where the version derives from nothing.
 */
export const derivationToleranceOf = (version: Version): CollationTolerance => {
    const principal = principalDerivationOf(version)
    return principal ? collationToleranceOf(principal) : defaultCollationTolerance
}

const millimetres = (value: Millimeters): string => String(Math.round(value * 100) / 100)

/**
 * The window at one end as a reader reads it. A window centred away from
 * zero names its centre, since the same reach means different readings
 * about a different centre.
 */
const windowText = (centre: Millimeters, reach: Millimeters): string =>
    centre === 0
        ? `±${millimetres(reach)} mm`
        : `${millimetres(centre)} ±${millimetres(reach)} mm`

/** The window a derivation was collated in, written out at each end. */
export const windowAtEnds = (tolerance: CollationTolerance): BothEnds<string> => ({
    from: windowText(offsetStartOf(tolerance), tolerance.toleranceStart),
    to: windowText(offsetEndOf(tolerance), tolerance.toleranceEnd)
})

/** Whether the window is centred away from zero at either end, which the sign alone does not explain. */
export const namesAnOffset = (tolerance: CollationTolerance): boolean =>
    offsetStartOf(tolerance) !== 0 || offsetEndOf(tolerance) !== 0

/** The millimetres the text spells, or nothing where it spells no usable tolerance. */
export const parseTolerance = (text: string): Millimeters | undefined => {
    const millimetres = Number(text)
    if (text.trim().length === 0) return undefined
    if (!Number.isFinite(millimetres) || millimetres < 0) return undefined
    return mm(millimetres)
}
