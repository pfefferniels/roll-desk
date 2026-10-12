import {
    adoptEdits, adoptionOf, adoptStemma, CollatedReading, Costs, defaultCosts, defaultMargin, defaultMovedWithin, defaultSameText, Edition,
    EditionOp, editsOf, EditType, FiliationOptions, mm, Run, siglaOf, StemmaProposal, stemmaChanges, Support, TrackMeaning, unchecked, Unpinned, versionIn
} from "linked-rolls"
import { copyLabel } from "../edition/names"
import { noteNameOf, wordsOf } from "../version/laneMeaning"

/** What the page asks the worker to propose a stemma for. */
export type FiliationRequest = { edition: Edition, options: FiliationOptions }

/** The worker's answer: the proposal, or why there is none. */
export type FiliationReply = { proposal: StemmaProposal } | { refusal: string }

/** The options that are typed as numbers. */
export type OptionField = keyof Costs | 'movedWithin' | 'margin' | 'sameText'

export type TypedOptions = Record<OptionField, string>

/** The fields as they stand before anything is typed: the values the edition of WM 225 is reproduced with. */
export const defaultTyping = (): TypedOptions => ({
    gain: String(defaultCosts.gain),
    redundantLoss: String(defaultCosts.redundantLoss),
    transferLoss: String(defaultCosts.transferLoss),
    copyDeviation: String(defaultCosts.copyDeviation),
    lostState: String(defaultCosts.lostState),
    movedWithin: String(defaultMovedWithin),
    margin: String(defaultMargin),
    sameText: String(defaultSameText)
})

/** Spellings of a cost too high to be paid. */
const unbounded = new Set(['∞', 'inf', 'infinity'])

/**
 * The amount the text spells, or nothing where it spells none: an empty
 * or half-typed field, or a negative amount. A copy's deviation may be
 * unbounded, which holds a copy to its version exactly. How many readings
 * copies of one text may differ in is a count, and so a whole number.
 */
export const parseAmount = (field: OptionField, text: string): number | undefined => {
    const trimmed = text.trim()
    if (field === 'copyDeviation' && unbounded.has(trimmed.toLowerCase())) return Infinity
    if (trimmed.length === 0) return undefined
    const amount = Number(trimmed)
    if (field === 'sameText' && !Number.isInteger(amount)) return undefined
    return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

/** The options the fields spell, or the fields that spell no amount. */
export const optionsOf = (typed: TypedOptions, pin: boolean): { options: FiliationOptions } | { invalid: OptionField[] } => {
    const fields = Object.keys(typed) as OptionField[]
    const invalid = fields.filter(field => parseAmount(field, typed[field]) === undefined)
    if (invalid.length > 0) return { invalid }

    const read = (field: OptionField) => parseAmount(field, typed[field])!
    return {
        options: {
            costs: {
                gain: read('gain'),
                redundantLoss: read('redundantLoss'),
                transferLoss: read('transferLoss'),
                copyDeviation: read('copyDeviation'),
                lostState: read('lostState')
            },
            movedWithin: mm(read('movedWithin')),
            margin: mm(read('margin')),
            sameText: read('sameText'),
            pin
        }
    }
}

/**
 * A run of the library's proposals started at the desk, as adopting one
 * records it: on the day, and by the editor where the edition names one
 * alone, who is then the one at the desk. Where it names several, who
 * ran it is left unstated.
 */
export const runOf = (edition: Pick<Edition, 'creation'>, on: Date = new Date()): Run => {
    const editors = edition.creation.editors ?? []
    const editor = editors.length === 1 ? editors[0] : undefined
    return {
        date: { within: new Date(on.getFullYear(), on.getMonth(), on.getDate()) },
        ...(editor && { actor: { name: editor.name, sameAs: editor.sameAs } })
    }
}

/**
 * The proposed stemma put in place of the edition's, and where asked,
 * the edits of its versions proposed from what each changes, as one
 * operation and so one undo step. Both are recorded as what the
 * library's run concluded, under the run given.
 */
export const adoption = (proposal: StemmaProposal, withEdits: boolean, run: Run = {}): EditionOp => draft => {
    adoptStemma(proposal, run)(draft)
    if (withEdits) adoptEdits(undefined, {}, run)(draft)
}

/** A refusal as a sentence, which the library words without the full stop. */
export const asSentence = (text: string): string => /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`

/** An amount as it is read: to two places at most, and an unbounded one as such. */
export const amount = (value: number): string =>
    Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '∞'

/** Names in a sentence: "A", "A and B", "A, B and C". */
export const listed = (names: readonly string[]): string =>
    names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

/** What the copies call each of them: its siglum, or where it has none, who holds it. */
export const copyNames = (edition: Pick<Edition, 'copies'>): (copyId: string) => string => {
    const names = new Map(edition.copies.map(copy => [copy.id, copyLabel(copy)]))
    return copyId => names.get(copyId) ?? copyId
}

/** What the preview calls each version of the proposal: its siglum, or its name within the proposal where it has none. */
export const proposedNames = (proposal: StemmaProposal, edition: Edition, preview: Edition): (proposed: string) => string => {
    const { ids } = adoptionOf(edition, proposal)
    const sigla = siglaOf(preview)
    return proposed => sigla.get(ids[proposed] ?? '') ?? proposed
}

/** How a version is reckoned on one side of the change: how many of its symbols stay, and which go or come. */
export interface Tally {
    kept: number
    gone: number
    added: number
}

/** One version of the change table. */
export interface ChangeRow {
    version: string
    /** What the stemma calls the version as the edition stands, or as proposed where it is new. */
    siglum: string
    /** What the proposed stemma calls it, where that is something else. */
    siglumAfter?: string
    /** Where the version is in one of the stemmata alone. */
    only?: 'before' | 'after'
    /** What it derives from as the edition stands: a siglum, null for nothing, undefined where it is not there. */
    parentBefore?: string | null
    /** The same as proposed. */
    parentAfter?: string | null
    /** Whether it derives from another version than before. */
    moved: boolean
    inserted: Tally
    deleted: Tally
    /** Whether anything about it changes. */
    changed: boolean
}

const tallyOf = ({ kept, gone, added }: { kept: number, gone: readonly string[], added: readonly string[] }): Tally =>
    ({ kept, gone: gone.length, added: added.length })

/**
 * Version by version, what adopting changes of the stemma: what each
 * derives from before and after, and how many of the symbols it inserts
 * and deletes stay, go or come. The versions of the edition first, in
 * its order, then the new ones.
 */
export const changeRows = (before: Edition, after: Edition): ChangeRow[] => {
    const siglaBefore = siglaOf(before)
    const siglaAfter = siglaOf(after)
    const nameIn = (sigla: ReadonlyMap<string, string>, parent: string | null | undefined) =>
        parent === undefined || parent === null ? parent : sigla.get(parent) ?? 'unnamed version'

    return stemmaChanges(before, after).map(change => {
        const only = change.parentBefore === undefined ? 'after' : change.parentAfter === undefined ? 'before' : undefined
        const siglum = siglaBefore.get(change.version) ?? siglaAfter.get(change.version) ?? 'unnamed version'
        const later = siglaAfter.get(change.version)
        const inserted = tallyOf(change.inserted)
        const deleted = tallyOf(change.deleted)
        const moved = only === undefined && change.parentBefore !== change.parentAfter
        return {
            version: change.version,
            siglum,
            ...(later !== undefined && later !== siglum && { siglumAfter: later }),
            ...(only && { only }),
            ...(change.parentBefore !== undefined && { parentBefore: nameIn(siglaBefore, change.parentBefore) }),
            ...(change.parentAfter !== undefined && { parentAfter: nameIn(siglaAfter, change.parentAfter) }),
            moved,
            inserted,
            deleted,
            changed: only !== undefined || moved || [inserted, deleted].some(tally => tally.gone + tally.added > 0)
        }
    })
}

/** What a grouping of the stemma says of the copies. */
export const supportLabel = (support: Support, nameOf: (copyId: string) => string): string => {
    if (!support.ancestor) return `${listed(support.copies.map(nameOf))} derive from one lost or common version`
    const carrying = support.ancestor
    const others = support.copies.filter(copy => !carrying.includes(copy)).map(nameOf)
    return `${listed(carrying.map(nameOf))} carr${carrying.length === 1 ? 'ies' : 'y'} the version ${listed(others)} derive${others.length === 1 ? 's' : ''} from`
}

/** Copies the proposal takes to carry one text, and how far apart they are. */
export interface TextRow {
    copies: string[]
    /** The most readings any two of them differ in. */
    differences: number
    /** Whether the edition gives them one version. */
    stated: boolean
}

/** The texts several copies carry, each one version of the proposal. */
export const textRows = (proposal: Pick<StemmaProposal, 'texts'>, copyName: (copyId: string) => string): TextRow[] =>
    proposal.texts
        .filter(text => text.copies.length > 1)
        .map(text => ({ copies: text.copies.map(copyName), differences: text.differences, stated: text.stated }))

/** How many readings apart, in words. */
export const readingsApart = (count: number): string => `${count} reading${count === 1 ? '' : 's'} apart`

/** How firmly the copies decide a grouping, as the cost of doing without it. */
export const marginLabel = (margin: number): string =>
    Number.isFinite(margin)
        ? `+${amount(margin)}: the best stemma without it costs that much more`
        : 'No stemma without it is admissible'

/** What a reading is: the note it sounds, or the command and the half it acts on. */
export const meaningLabel = (meaning: TrackMeaning): string =>
    meaning.type === 'note' ? noteNameOf(meaning.pitch) : `${wordsOf(meaning.expressionType)}, ${meaning.scope}`

/** A reading as the lists show it. */
export interface ReadingRow {
    reading: string
    meaning: string
    /** Where it begins on the roll. */
    place: string
    /** The copies carrying it. */
    copies: string[]
}

export const readingRow = (reading: CollatedReading, nameOf: (copyId: string) => string): ReadingRow => ({
    reading: reading.id,
    meaning: meaningLabel(reading.meaning),
    place: `${reading.place.from.toFixed(1)} mm`,
    copies: reading.copies.map(nameOf)
})

const readingsOf = (proposal: Pick<StemmaProposal, 'collation'>) =>
    new Map(proposal.collation.readings.map(reading => [reading.id, reading]))

/** The readings the stemma lets arise more than once, each with the versions inserting it. */
export const conflictRows = (
    proposal: Pick<StemmaProposal, 'conflicts' | 'collation'>,
    copyName: (copyId: string) => string,
    versionName: (proposed: string) => string
): (ReadingRow & { versions: string[] })[] => {
    const readings = readingsOf(proposal)
    return proposal.conflicts.flatMap(({ reading, versions }) => {
        const collated = readings.get(reading)
        return collated ? [{ ...readingRow(collated, copyName), versions: versions.map(versionName) }] : []
    })
}

/** The readings a version holds that a copy carrying it lacks. */
export const deviationRows = (
    proposal: Pick<StemmaProposal, 'versions' | 'collation'>,
    copyName: (copyId: string) => string,
    versionName: (proposed: string) => string
): (ReadingRow & { version: string, copy: string })[] => {
    const readings = readingsOf(proposal)
    return proposal.versions.flatMap(proposed => proposed.deviations.flatMap(({ copy, reading }) => {
        const collated = readings.get(reading)
        return collated ? [{ ...readingRow(collated, copyName), version: versionName(proposed.id), copy: copyName(copy) }] : []
    }))
}

/** The readings taken for the base text, as moved or cleaned up by the other side of the root. */
export const baseTextRows = (proposal: Pick<StemmaProposal, 'baseText' | 'collation'>, copyName: (copyId: string) => string): ReadingRow[] => {
    const readings = readingsOf(proposal)
    return proposal.baseText.flatMap(reading => {
        const collated = readings.get(reading)
        return collated ? [readingRow(collated, copyName)] : []
    })
}

const unpinnedReasons: Record<Unpinned['reason'], string> = {
    'version-gone': 'No version of the proposal stands for its version',
    'reading-gone': 'A symbol it inserts or deletes is no reading of the copies',
    'contradicts-copies': 'The copies cannot be read so'
}

/** An edit the editor wrote that the proposal does not keep, and why. */
export interface UnpinnedRow {
    edit: string
    /** The version it was written on, as the edition stands. */
    version: string
    reason: string
    /** What the editor gave as its motivation, where they gave one. */
    motivation?: string
}

export const unpinnedRows = (unpinned: readonly Unpinned[], edition: Edition): UnpinnedRow[] => {
    const sigla = siglaOf(edition)
    return unpinned.map(({ edit, version, reason }) => {
        const stated = versionIn(edition, version)
        const motivationId = stated && editsOf(stated).find(one => one.id === edit)?.motivation
        const motivation = motivationId ? stated.motivations.find(one => one.id === motivationId)?.note : undefined
        return {
            edit,
            version: sigla.get(version) ?? 'unnamed version',
            reason: unpinnedReasons[reason],
            ...(motivation && { motivation })
        }
    })
}

/** What each edit type is called in a count, one and many. */
const editTypeWords: Record<EditType, [string, string]> = {
    'additional-accent': ['accent added', 'accents added'],
    'add-redundancy': ['redundancy added', 'redundancies added'],
    'remove-redundancy': ['redundancy removed', 'redundancies removed'],
    'recoding': ['recoding', 'recodings'],
    'shift': ['shift', 'shifts'],
    'shorten': ['shortening', 'shortenings'],
    'prolong': ['prolongation', 'prolongations']
}

/** The edits of one version as adopting leaves them. */
export interface EditRow {
    version: string
    siglum: string
    edits: number
    /** How many of them nobody has said why yet. */
    unmotivated: number
    /** How many there are of each type, the commonest first, in words. */
    types: string[]
}

/**
 * Version by version, the edits adopting leaves, and how many of them are
 * left to motivate. The root is left out: what it inserts is its text,
 * not edits of another.
 */
export const editRows = (after: Edition): EditRow[] => {
    const sigla = siglaOf(after)
    return after.versions
        .filter(version => (version.basedOn ?? []).length > 0)
        .map(version => {
            const edits = editsOf(version)
            const counts = new Map<string, number>()
            edits.forEach(edit => {
                const type = edit.editType ?? 'untyped'
                counts.set(type, (counts.get(type) ?? 0) + 1)
            })
            const types = [...counts]
                .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
                .map(([type, count]) => {
                    const [one, many] = type === 'untyped' ? ['untyped', 'untyped'] : editTypeWords[type as EditType]
                    return `${count} ${count === 1 ? one : many}`
                })
            return {
                version: version.id,
                siglum: sigla.get(version.id) ?? 'unnamed version',
                edits: edits.length,
                unmotivated: edits.filter(edit => edit.motivation === undefined || edit.motivation === unchecked).length,
                types
            }
        })
}
