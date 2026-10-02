import { extent } from "d3-array"
import { Edition, insertedBy } from "linked-rolls"
import { Compass } from "../canvas/rollGeometry"

/**
 * The lowest and the highest note the edition's versions play, nothing
 * where none of them plays one. It is taken over every version rather
 * than the one on the desk, so that the keyboard stays put from one
 * version to the next; and a note a version deletes was inserted by one
 * before it, so its key is within the compass too.
 */
export const compassOf = (edition: Pick<Edition, 'versions'>): Compass | undefined => {
    const pitches = edition.versions
        .flatMap(insertedBy)
        .flatMap(symbol => symbol.type === 'note' ? [symbol.pitch] : [])

    const [lowest, highest] = extent(pitches)
    if (lowest === undefined || highest === undefined) return undefined

    return { lowest, highest }
}
