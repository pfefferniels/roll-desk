import { CollationTolerance, defaultCollationTolerance, Edition, EditionOp } from "linked-rolls"

/** The tolerance the edition collates with, or the library's default where it names none. */
export const toleranceOf = (edition: Edition | undefined): CollationTolerance =>
    edition?.creation.collationTolerance ?? defaultCollationTolerance

/** The operation as one step, with the tolerance it collated at kept on the edition. */
export const keepingTolerance = (tolerance: CollationTolerance, op: EditionOp): EditionOp =>
    draft => {
        op(draft)
        draft.creation.collationTolerance = tolerance
    }

/** The millimetres the text spells, or nothing where it spells no usable tolerance. */
export const parseTolerance = (text: string): number | undefined => {
    const millimetres = Number(text)
    if (text.trim().length === 0) return undefined
    if (!Number.isFinite(millimetres) || millimetres < 0) return undefined
    return millimetres
}
