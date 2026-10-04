import { Motivation, unchecked } from "linked-rolls"

export const isMotivation = (obj: unknown): obj is Motivation =>
    typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'motivation'

/**
 * A motivation together with the version holding it.
 *
 * An id does not name a motivation on its own. A collation writes
 * `unchecked` on everything it makes, so every version that was
 * collated carries a motivation of that name, and two versions may
 * agree on an id for any other reason as well. The desk therefore marks,
 * counts and addresses a motivation as one of a particular version.
 */
export interface HeldMotivation {
    versionId: string
    motivation: Motivation
}

export const isHeldMotivation = (obj: unknown): obj is HeldMotivation =>
    typeof obj === 'object' && obj !== null &&
    'motivation' in obj && isMotivation(obj.motivation) &&
    'versionId' in obj && typeof obj.versionId === 'string'

/** Whether the two are the one motivation of the one version. */
export const sameMotivation = (one: HeldMotivation, other: HeldMotivation) =>
    one.versionId === other.versionId && one.motivation.id === other.motivation.id

/** How long an id made from a note runs at most, a number to tell it apart left aside. */
const longest = 40

/**
 * Ids a new motivation is not given although nothing holds them yet: the
 * one a collation writes, which it would take for its own and rewrite,
 * and the editor's, whose address the desk keeps for itself.
 */
const reserved = [unchecked, 'editor']

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
