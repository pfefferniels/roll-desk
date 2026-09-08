import { CollationTolerance, defaultCollationTolerance, Edition, Millimeters, mm, Version } from "linked-rolls"

/** The tolerance the edition collates with, or the library's default where it names none. */
export const toleranceOf = (edition: Edition | undefined): CollationTolerance =>
    edition?.creation.collationTolerance ?? defaultCollationTolerance

/**
 * The tolerance the version's derivation was collated at. A version that
 * derives from nothing, and one whose derivation states no tolerance as
 * `deriveVersion` leaves it, falls back to the edition's value.
 */
export const derivationToleranceOf = (version: Version, edition: Edition): CollationTolerance =>
    version.basedOn?.collationTolerance ?? toleranceOf(edition)

/** The millimetres the text spells, or nothing where it spells no usable tolerance. */
export const parseTolerance = (text: string): Millimeters | undefined => {
    const millimetres = Number(text)
    if (text.trim().length === 0) return undefined
    if (!Number.isFinite(millimetres) || millimetres < 0) return undefined
    return mm(millimetres)
}
