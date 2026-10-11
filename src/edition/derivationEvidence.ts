import {
    Bearing, bearingsOf, deletedBy, Edition, EditType, editTypesOf, insertedBy, lineageOf, predecessorOf, Restoration,
    restorationsOf, versionIn
} from "linked-rolls"

/** How one copy bears a version's insertions, as counts. */
export interface Counts {
    carried: number
    replaced: number
    struck: number
    /** What it carries against the stemma. */
    unaccounted: number
}

/** A copy's row in the evidence for a derivation. */
export interface EvidenceRow {
    copy: string
    /** Whether the copy's line runs through the version. */
    inLine: boolean
    /** How it bears what the version inserts. */
    insertions: Counts
    /** How many of the symbols the version strikes it still carries. */
    keeps: number
    /** How it bears what the parent inserts, where the parent is shown. */
    parent?: Counts
}

/**
 * What the edition holds as evidence that a version derives from its
 * parent, as `derivationEvidenceOf` gathers it: how each copy bears
 * what the version inserts and strikes, and the parent's own insertions
 * on the same copies, which bind the version to it; the versions apart
 * from its line that none of its copies follows; how its edits work on
 * the text; and what it puts back that an ancestor struck. What speaks
 * against the derivation shows in the rows as `unaccounted`.
 */
export interface DerivationEvidence {
    inserted: number
    struck: number
    /** The parent, where it is not the root: the root's insertions are the text every copy shares, which binds nothing. */
    parent?: { version: string, inserted: number }
    /** The copies of the version's line first, then the others, each in the order the edition lists them. */
    rows: EvidenceRow[]
    /** The versions off the version's line whose insertions none of its copies carries. */
    apart: string[]
    /** The version's edits by type, the most frequent first, those stating none last. */
    editTypes: [EditType | undefined, number][]
    /** The version's insertions that put back what an ancestor struck. */
    restorations: Restoration[]
}

const countsOf = (bearing: Bearing): Counts => ({
    carried: bearing.carried.length,
    replaced: bearing.replaced.length,
    struck: bearing.struck.length,
    unaccounted: bearing.unaccounted.filter(symbol => !bearing.keeps.includes(symbol)).length
})

/** Whether one version lies on the other's line, either above or below it. */
const related = (edition: Edition, one: string, other: string): boolean =>
    lineageOf(edition, one).some(version => version.id === other)
    || lineageOf(edition, other).some(version => version.id === one)

/** The evidence for the version's derivation from the version its text is read against, or nothing where it derives from none. */
export const derivationEvidenceOf = (edition: Edition, versionId: string): DerivationEvidence | undefined => {
    const version = versionIn(edition, versionId)
    const parent = predecessorOf(edition, versionId)
    if (!version || !parent) return undefined

    const bearings = bearingsOf(edition, versionId)
    const ownCopies = new Set(bearings.filter(bearing => bearing.inLine).map(bearing => bearing.copy))
    const showsParent = predecessorOf(edition, parent.id) !== undefined
    const parentBearings = new Map(showsParent
        ? bearingsOf(edition, parent.id).map(bearing => [bearing.copy, bearing])
        : [])

    const rows = bearings
        .map((bearing): EvidenceRow => {
            const ofParent = parentBearings.get(bearing.copy)
            return {
                copy: bearing.copy,
                inLine: bearing.inLine,
                insertions: countsOf(bearing),
                keeps: bearing.keeps.length,
                ...(ofParent && bearing.inLine && { parent: countsOf(ofParent) })
            }
        })
        .sort((a, b) => Number(b.inLine) - Number(a.inLine))

    const apart = edition.versions
        .filter(other => insertedBy(other).length > 0 && !related(edition, versionId, other.id))
        .filter(other => bearingsOf(edition, other.id).every(bearing => !ownCopies.has(bearing.copy) || bearing.carried.length === 0))
        .map(other => other.id)

    return {
        inserted: insertedBy(version).length,
        struck: deletedBy(version).length,
        ...(showsParent && { parent: { version: parent.id, inserted: insertedBy(parent).length } }),
        rows,
        apart,
        editTypes: [...editTypesOf(version)]
            .sort(([typeA, a], [typeB, b]) => Number(typeA === undefined) - Number(typeB === undefined) || b - a),
        restorations: restorationsOf(edition, versionId)
    }
}
