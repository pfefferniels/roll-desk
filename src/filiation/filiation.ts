import {
    adoptionOf, CollatedReading, Costs, defaultCosts, defaultMargin, defaultMovedWithin, Edition, editsOf, FiliationOptions, mm, siglaOf,
    StemmaProposal, stemmaChanges, Support, TrackMeaning, Unpinned, versionIn
} from "linked-rolls"
import { copyLabel } from "../edition/names"
import { noteNameOf, wordsOf } from "../version/laneMeaning"

/** What the page asks the worker to propose a stemma for. */
export type FiliationRequest = { edition: Edition, options: FiliationOptions }

/** The worker's answer: the proposal, or why there is none. */
export type FiliationReply = { proposal: StemmaProposal } | { refusal: string }

/** The options that are typed as numbers. */
export type OptionField = keyof Costs | 'movedWithin' | 'margin'

export type TypedOptions = Record<OptionField, string>

/** The fields as they stand before anything is typed: the values the edition of WM 225 is reproduced with. */
export const defaultTyping = (): TypedOptions => ({
    gain: String(defaultCosts.gain),
    redundantLoss: String(defaultCosts.redundantLoss),
    transferLoss: String(defaultCosts.transferLoss),
    copyDeviation: String(defaultCosts.copyDeviation),
    lostState: String(defaultCosts.lostState),
    movedWithin: String(defaultMovedWithin),
    margin: String(defaultMargin)
})

/** Spellings of a cost too high to be paid. */
const unbounded = new Set(['∞', 'inf', 'infinity'])

/**
 * The amount the text spells, or nothing where it spells none: an empty
 * or half-typed field, or a negative amount. A copy's deviation may be
 * unbounded, which holds a copy to its version exactly.
 */
export const parseAmount = (field: OptionField, text: string): number | undefined => {
    const trimmed = text.trim()
    if (field === 'copyDeviation' && unbounded.has(trimmed.toLowerCase())) return Infinity
    if (trimmed.length === 0) return undefined
    const amount = Number(trimmed)
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
            pin
        }
    }
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
    const others = support.copies.filter(copy => copy !== support.ancestor).map(nameOf)
    return `${nameOf(support.ancestor)} carries the version ${listed(others)} derive${others.length === 1 ? 's' : ''} from`
}

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

/** The readings a version holds that the copy carrying it lacks. */
export const deviationRows = (
    proposal: Pick<StemmaProposal, 'versions' | 'collation'>,
    copyName: (copyId: string) => string,
    versionName: (proposed: string) => string
): (ReadingRow & { version: string, copy: string })[] => {
    const readings = readingsOf(proposal)
    return proposal.versions.flatMap(proposed => proposed.deviations.flatMap(reading => {
        const collated = readings.get(reading)
        return collated && proposed.copy
            ? [{ ...readingRow(collated, copyName), version: versionName(proposed.id), copy: copyName(proposed.copy) }]
            : []
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
