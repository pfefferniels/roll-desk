import { EditionView, isMeasured, RollCopy, siglaOf, SourceKind, Version } from "linked-rolls"
import { heldBy } from "./heldBy"

/** Each kind of source as a title, where `sourceLabels` gives the phrase a sentence needs. */
const sourceTitles: Record<SourceKind, string> = {
    roll: 'Roll',
    scan: 'Scan',
    analysis: 'Hole analysis',
    reading: 'Roll reader',
    emulation: 'MIDI emulation',
    recording: 'Audio recording'
}

/** The kind of secondary source a copy is known from, or nothing where its features were measured. */
export const secondarySourceOf = (copy: RollCopy): string | undefined =>
    copy.readFrom && !isMeasured(copy.readFrom.kind) ? sourceTitles[copy.readFrom.kind] : undefined

/** What a reader calls the copy: its siglum, or where it has none, who holds it. */
export const copyLabel = (copy: RollCopy): string => copy.siglum || copy.keeper?.name.trim() || 'unnamed copy'

/** Which copy is meant, as a sentence goes on after "the copy". */
export const whichCopy = (copy: RollCopy): string => copy.siglum || `held by ${heldBy(copy)}`

/**
 * What the stemma calls the version as it stands. The label is read off
 * the stemma rather than stored, so it follows every change to it, and
 * a version no copy shows at first hand comes back in lowercase.
 */
export const versionLabel = (view: EditionView, versionId: string): string =>
    siglaOf(view).get(versionId) ?? 'unnamed version'

/** What a reader calls the version or the copy under the id, or nothing where it names neither. */
export const nameOf = (view: EditionView, id: string): string | undefined => {
    const entity = view.get<Version | RollCopy>(id)
    if (entity?.type === 'Version') return versionLabel(view, entity.id)
    if (entity?.type === 'RollCopy') return copyLabel(entity)
    return undefined
}
