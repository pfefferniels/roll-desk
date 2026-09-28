import { Alignment, AlignmentProblem, Millimeters, ownFeaturesOf, RollCopy, Strain, toAxis } from "linked-rolls"

/** Two decimals of the percentage, so four of the factor it was read from. */
export const asPercent = (factor: number) => `${(factor * 100).toFixed(2)} %`

/** A share in parts per million, as the precision of a scale is worth stating. */
export const inPpm = (share: number) => `${Math.round(share * 1e6)} ppm`

/** A strain with its sign and its uncertainty, to the hundredth of a per cent; one that rounds to nothing has no sign. */
export const strainStatement = ({ value, uncertainty }: Strain) => {
    const rounded = Math.abs(value).toFixed(2)
    const sign = Number(rounded) === 0 ? '' : value < 0 ? '−' : '+'
    const signed = `${sign}${rounded}`
    return uncertainty === undefined ? `${signed} %` : `${signed} ± ${uncertainty.toFixed(2)} %`
}

/** The alignment as numbers: shift and scale, and how well it rests where it says. */
export const alignmentStatement = (alignment: Alignment) => {
    const numbers = `shift ${alignment.shift.horizontal.toFixed(2)} mm, scale ${alignment.scale.toFixed(6)}`
    const rests = alignment.matched !== undefined && alignment.residual !== undefined
        ? `, on ${alignment.matched} notes ${alignment.residual.toFixed(2)} mm apart`
        : ''
    const error = alignment.scaleError !== undefined && Number.isFinite(alignment.scaleError)
        ? `, scale to ${inPpm(alignment.scaleError / alignment.scale)}`
        : ''
    return numbers + rests + error
}

/**
 * How far the other alignment would move the copy's places on the axis,
 * at most. The alignments are straight lines, so the most is at one end
 * of what the copy states.
 */
export const movesBy = (copy: RollCopy, other: Alignment): Millimeters | undefined => {
    const places = ownFeaturesOf(copy).flatMap(feature => [feature.horizontal.from, feature.horizontal.to ?? feature.horizontal.from])
    if (places.length === 0) return undefined

    const now = toAxis(copy.measurements.alignment)
    const then = toAxis(other)
    const ends = [Math.min(...places), Math.max(...places)] as Millimeters[]
    return Math.max(...ends.map(end => Math.abs(then(end) - now(end)))) as Millimeters
}

/** What a problem of the alignments says, in words. */
export const problemStatement = ({ problem, by = 0 }: AlignmentProblem): string => {
    switch (problem) {
        case 'not-aligned':
            return 'The copy is not aligned with the reference copy yet.'
        case 'aligned-against-another-copy':
            return 'The copy was aligned against another copy than the reference copy; align it again.'
        case 'speed-disagrees-with-paper':
            return `The paper speed stated for the copy gives a ratio of the papers ${asPercent(Math.abs(Math.expm1(by)))} ${by > 0 ? 'above' : 'below'} what the alignments give.`
        case 'paper-beyond-its-spread':
            return `The copy's paper strays by ${by.toFixed(2)} % from the other copies of its system, more than paper does: it may have been cut for another speed, or read wrongly.`
    }
}
