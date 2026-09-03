import { Edition } from "linked-rolls"

/**
 * An edition whose copies carry no measurements yet still needs a canvas
 * wide enough to draw the first features onto.
 */
const shortestUsefulRoll = 5000

/**
 * How far the roll runs, in millimetres, taken from the last measured
 * feature of any copy. Versions are drawn from those same features, so
 * this covers them as well.
 */
export const rollLength = (edition: Edition) => {
    const measured = edition.copies
        .flatMap(copy => copy.features)
        .reduce((end, feature) => Math.max(end, feature.horizontal.to), 0)

    return Math.max(measured, shortestUsefulRoll)
}
