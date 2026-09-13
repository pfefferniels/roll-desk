import { EditionView, RollCopy, Version } from "linked-rolls"
import { heldBy } from "./heldBy"

/** What a reader calls the copy: its siglum, or where it has none, who holds it. */
export const copyLabel = (copy: RollCopy): string => copy.siglum || copy.keeper?.name.trim() || 'unnamed copy'

/** Which copy is meant, as a sentence goes on after "the copy". */
export const whichCopy = (copy: RollCopy): string => copy.siglum || `held by ${heldBy(copy)}`

/** What a reader calls the version or the copy under the id, or nothing where it names neither. */
export const nameOf = (view: EditionView, id: string): string | undefined => {
    const entity = view.get<Version | RollCopy>(id)
    if (entity?.type === 'Version') return entity.siglum
    if (entity?.type === 'RollCopy') return copyLabel(entity)
    return undefined
}
