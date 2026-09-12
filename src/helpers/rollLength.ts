import { Edition, max, Millimeters, mm } from "linked-rolls"

/**
 * An edition whose copies carry no measurements yet still needs a canvas
 * wide enough to draw the first features onto.
 */
const shortestUsefulRoll = mm(5000)

/**
 * How far the roll runs, taken from the last measured feature of any
 * copy. Versions are drawn from those same features, so this covers
 * them as well.
 */
export const rollLength = (edition: Edition): Millimeters => {
    const measured = edition.copies
        .flatMap(copy => copy.features)
        .reduce((end, feature) => max(end, feature.horizontal.to), mm(0))

    return max(measured, shortestUsefulRoll)
}
