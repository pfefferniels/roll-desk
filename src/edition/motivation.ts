import { ChangeKind, Edit, Edition, EditionOp, Motivation, Version, editsOf, kindOfChange, musicalChange, placeOf, principalDerivationOf, symbolIn, technicalChange, versionIn } from "linked-rolls"

export const isMotivation = (obj: unknown): obj is Motivation =>
    typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'motivation'

/**
 * A motivation together with the version it is looked at on.
 *
 * The edition states a motivation once, and the edits of any version may
 * name it. The desk marks and counts it on the roll of one version at a
 * time, its edits there, so it holds the motivation together with that
 * version.
 */
export interface HeldMotivation {
    versionId: string
    motivation: Motivation
}

export const isHeldMotivation = (obj: unknown): obj is HeldMotivation =>
    typeof obj === 'object' && obj !== null &&
    'motivation' in obj && isMotivation(obj.motivation) &&
    'versionId' in obj && typeof obj.versionId === 'string'

/** Whether the two are the one motivation, looked at on the one version. */
export const sameMotivation = (one: HeldMotivation, other: HeldMotivation) =>
    one.versionId === other.versionId && one.motivation.id === other.motivation.id

/**
 * The edition's motivations that the version's edits name, in the order
 * the edition states them.
 */
export const motivationsOn = (motivations: readonly Motivation[] | undefined, version: Readonly<Version>): Motivation[] => {
    const named = new Set(editsOf(version).map(edit => edit.motivation))
    return (motivations ?? []).filter(motivation => named.has(motivation.id))
}

/**
 * The motivations in focus on a version's roll: the one the pointer rests
 * on, where it is one of this version's, and otherwise those held. A slice
 * of another derivation pointed at leaves this roll to what it holds.
 */
export const inFocusOn = (
    versionId: string,
    held: readonly HeldMotivation[],
    pointed?: HeldMotivation
): Motivation[] =>
    pointed?.versionId === versionId
        ? [pointed.motivation]
        : held.filter(one => one.versionId === versionId).map(one => one.motivation)

/**
 * The edits a motivation holds, in the order they come along the roll: by
 * where the first of what each inserts or deletes begins. The version keeps
 * its edits in an order of its own, which need not be that one. An edit
 * touching nothing the roll can place comes last.
 */
export const editsAlongRoll = (edition: Edition, held: HeldMotivation): Edit[] => {
    const version = versionIn(edition, held.versionId)
    if (!version) return []

    const beginning = (edit: Edit) => {
        const touched = [...edit.insert ?? [], ...(edit.delete ?? []).map(id => symbolIn(edition, id))]
        const onsets = touched.flatMap(symbol => {
            const place = symbol && placeOf(edition, symbol)
            return place ? [place.from] : []
        })
        return onsets.length > 0 ? Math.min(...onsets) : Infinity
    }

    return editsOf(version)
        .filter(edit => edit.motivation === held.motivation.id)
        .map(edit => ({ edit, from: beginning(edit) }))
        .sort((a, b) => a.from - b.from)
        .map(({ edit }) => edit)
}

/**
 * The kind of change all the edits are, where they agree on one: musical
 * or technical, as their motivations say (`kindOfChange`).
 */
export const kindOfAll = (edits: readonly Pick<Edit, 'motivation'>[]): ChangeKind | undefined => {
    const kinds = new Set(edits.map(kindOfChange))
    return kinds.size === 1 ? [...kinds][0] : undefined
}

/** The edit as a change of the kind given: as it is where it is one already. */
export const asKind = <E extends Pick<Edit, 'motivation'>>(edit: E, kind: ChangeKind): E =>
    kindOfChange(edit) === kind ? edit : { ...edit, motivation: kind === 'musical' ? musicalChange : technicalChange }

/**
 * Says that the edits of the version are changes of the kind given,
 * where the editor reads them otherwise than the program did from their
 * shape. An edit made musical states the generic musical motivation,
 * whose reason the editor may give next; one already musical keeps the
 * reason it has. An edit made technical gives no reason, and a
 * motivation no edit names any longer goes. The edits of a version that
 * derives from none state its text and are of no kind, so that nothing
 * changes there.
 */
export const stateKind = (versionId: string, editIds: readonly string[], kind: ChangeKind): EditionOp => draft => {
    const version = draft.versions.find(v => v.id === versionId)
    if (!version || !principalDerivationOf(version)) return
    const ids = new Set(editIds)
    const given = new Set<string>()
    editsOf(version)
        .filter(edit => ids.has(edit.id) && kindOfChange(edit) !== kind)
        .forEach(edit => {
            if (edit.motivation) given.add(edit.motivation)
            edit.motivation = asKind(edit, kind).motivation
        })
    if (given.size === 0 || !draft.motivations) return
    const named = new Set(draft.versions.flatMap(other => editsOf(other).map(edit => edit.motivation)))
    draft.motivations = draft.motivations.filter(motivation => !given.has(motivation.id) || named.has(motivation.id))
}

/** How long an id made from a note runs at most, a number to tell it apart left aside. */
const longest = 40

/**
 * Ids a new motivation is not given although nothing holds them yet: the
 * one an import takes for an edit that a document written before
 * linked-rolls 0.76 left unchecked, whose kind it reads off its shape
 * instead, and the editor's, whose address the desk keeps for itself.
 */
const reserved = ['unchecked', 'editor']

/**
 * An id for a new motivation, made from its note, so that its address
 * says what it is about: "Bereinigung des Basses" becomes
 * `bereinigung-des-basses`. Umlauts are spelled out and other accents
 * dropped, and a long note is cut after the last whole word that fits.
 * Where the edition already gives an entity the id, a number follows, so
 * that the address names this motivation and no other.
 */
export const motivationIdFor = (note: string, taken: Iterable<string>): string => {
    const words = note
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter(word => word.length > 0)

    let stem = ''
    for (const word of words) {
        const longer = stem ? `${stem}-${word}` : word
        if (longer.length > longest) break
        stem = longer
    }
    stem ||= words[0]?.slice(0, longest) ?? 'motivation'

    const unavailable = new Set([...taken, ...reserved])
    if (!unavailable.has(stem)) return stem
    for (let n = 2; ; n++) {
        const numbered = `${stem}-${n}`
        if (!unavailable.has(numbered)) return numbered
    }
}
