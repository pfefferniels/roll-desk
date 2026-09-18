import { CollationTolerance, collationToleranceOf, defaultCollationTolerance, Millimeters, mm, principalDerivationOf, Version } from "linked-rolls"

/**
 * The tolerance the version's principal derivation was collated at, or the
 * library's default where the version derives from nothing.
 */
export const derivationToleranceOf = (version: Version): CollationTolerance => {
    const principal = principalDerivationOf(version)
    return principal ? collationToleranceOf(principal) : defaultCollationTolerance
}

/** The millimetres the text spells, or nothing where it spells no usable tolerance. */
export const parseTolerance = (text: string): Millimeters | undefined => {
    const millimetres = Number(text)
    if (text.trim().length === 0) return undefined
    if (!Number.isFinite(millimetres) || millimetres < 0) return undefined
    return mm(millimetres)
}
