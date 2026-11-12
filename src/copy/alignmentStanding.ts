import { Alignment, barOf, Edition, featuresOf, referenceCopyOf, RollCopy } from "linked-rolls"
import { copyLabel } from "../edition/names"

/**
 * How a copy lies on the reference copy: how many notes it has, and how
 * many of them the alignment found there. A copy read wrongly, off its
 * tracks or on the wrong clock, shows here before it shows anywhere
 * else, as an alignment that found few of its notes or none.
 */
export interface AlignmentStanding {
    /** What the copy is called. */
    copy: string
    /** What the reference copy is called. */
    reference: string
    /** The chains the copy's own bar reads as notes. */
    notes: number
    /** How many of them found their counterpart; nothing where the copy is not aligned. */
    matched?: number
    /** How far the counterparts still lie apart, in millimetres. */
    residual?: number
    /** Own millimetres to the reference copy's. */
    scale?: number
}

/** How many chains of the copy its own bar reads as notes. */
export const notesOn = (copy: RollCopy): number => {
    const bar = barOf(copy)
    return featuresOf(copy).filter(feature =>
        feature.type === 'HoleChain' && bar.meaningsOf(feature.vertical).some(meaning => meaning.type === 'note')).length
}

/**
 * The share of a copy's notes an alignment has to find for the copy to
 * be taken as lying on the reference copy. Copies of one roll read
 * rightly share nearly all of them; one read off its tracks or on the
 * wrong clock aligns on a tenth, by chance.
 */
export const wellAligned = 2 / 3

/** Whether the copy lies on the reference copy with most of its notes. */
export const liesWell = ({ notes, matched }: AlignmentStanding): boolean =>
    matched !== undefined && matched >= notes * wellAligned

/**
 * How the copy stands against the edition's reference copy, given the
 * alignment found for it; nothing where there is no reference copy to
 * lie on, where the copy is the reference copy itself, or where it has
 * no notes to align.
 */
export const standingOf = (
    edition: Pick<Edition, 'copies' | 'referenceCopy'>,
    copy: RollCopy,
    alignment: Alignment | undefined = copy.measurements.alignment
): AlignmentStanding | undefined => {
    const reference = referenceCopyOf(edition)
    const notes = notesOn(copy)
    if (!reference || reference.id === copy.id || notes === 0) return undefined

    return {
        copy: copyLabel(copy),
        reference: copyLabel(reference),
        notes,
        ...(alignment && { matched: alignment.matched ?? notes, residual: alignment.residual, scale: alignment.scale })
    }
}

const millimetres = (value: number) => `${Math.round(value * 10) / 10} mm`

/** The standing as a sentence. */
export const standingAsSentence = (standing: AlignmentStanding): string => {
    const { copy, reference, notes, matched, residual } = standing
    if (matched === undefined) {
        return `${copy} could not be aligned with ${reference}: the two share no run of notes. Check the system it was read for.`
    }
    const found = `${matched} of its ${notes} notes`
    return liesWell(standing)
        ? `${copy} lies on ${reference} with ${found}${residual !== undefined ? `, ${millimetres(residual)} apart` : ''}.`
        : `${copy} lies on ${reference} with only ${found}. Check the system it was read for and how its file puts it on the paper.`
}

/**
 * What stands in the way of collating the copies, a sentence for each
 * copy that does not lie on the reference copy with most of its notes.
 * Such a copy is collated where it was read, and nearly every reading
 * it has then counts as its own.
 */
export const alignmentWarnings = (edition: Pick<Edition, 'copies' | 'referenceCopy'>): string[] =>
    edition.copies
        .flatMap(copy => standingOf(edition, copy) ?? [])
        .filter(standing => !liesWell(standing))
        .map(standingAsSentence)
