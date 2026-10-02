/**
 * The suggested citation of the edition, or of something in it, in
 * English and in German: by its shortest address, under the version the
 * edition states of itself and the commit whose file the reader saw.
 * The version is what a reader names, the commit what gives back exactly
 * what they saw, since the edition goes on changing between versions.
 */

import { copyIn, Edition, getAt, pathIn, versionIn } from "linked-rolls"
import { linkTarget } from "./addresses"
import { isMotivation } from "./motivation"
import { copyLabel, versionLabel } from "./names"
import type { Commit } from "./publication"

export type Language = 'en' | 'de'

/** What is cited within the edition: a version, a copy, or an entity on one of them. */
export interface Part {
    /** `version`, `copy`, or the type the entity states, such as `note` or `HoleChain`. */
    kind: string
    /** What a version or a copy is called. */
    siglum?: string
    /** The version or copy the entity stands on. */
    on?: { kind: 'version' | 'copy', siglum: string }
}

export interface Citation {
    edition: Edition
    /** What is cited within the edition, or nothing where it is the edition as a whole. */
    part?: Part
    /** Where what is cited opens. */
    url: string
    /** The commit holding what the reader saw, where it is known. */
    commit?: Commit
    /** The day the reader saw it. */
    accessed: Date
}

/** The type an entity states, a motivation being known by its shape. */
const typeOf = (entity: unknown): string => {
    if (isMotivation(entity)) return 'motivation'
    return typeof entity === 'object' && entity !== null && 'type' in entity && typeof entity.type === 'string'
        ? entity.type
        : 'entity'
}

/** What is cited under the id, or nothing where the edition holds nothing under it. */
export const partNamed = (edition: Edition, id: string): Part | undefined => {
    if (versionIn(edition, id)) return { kind: 'version', siglum: versionLabel(edition, id) }

    const copy = copyIn(edition, id)
    if (copy) return { kind: 'copy', siglum: copyLabel(copy) }

    const path = pathIn(edition, id)
    const target = linkTarget(edition, id)
    if (!path || !target) return undefined

    const kind = typeOf(getAt<unknown>(path, edition))
    if (target.on === 'version') return { kind, on: { kind: 'version', siglum: versionLabel(edition, target.versionId) } }
    if (target.on === 'copy') {
        const on = copyIn(edition, target.copyId)
        return on ? { kind, on: { kind: 'copy', siglum: copyLabel(on) } } : { kind }
    }
    return { kind }
}

/** `HoleChain` is a hole chain. */
const inWords = (type: string) => {
    const words = type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
    return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The words the dissertation uses, where they differ from the type's. */
const germanKinds: Record<string, string> = {
    version: 'Version',
    copy: 'Rollenkopie',
    HoleChain: 'Stanzung',
    belief: 'Annahme'
}

const kindIn = (language: Language, kind: string) =>
    language === 'de' ? germanKinds[kind] ?? inWords(kind) : inWords(kind)

/** "Version R2", "Note on version R4"; "Stanzung auf Rollenkopie St1". */
const partIn = (language: Language, { kind, siglum, on }: Part): string => {
    const named = siglum ? `${kindIn(language, kind)} ${siglum}` : kindIn(language, kind)
    if (!on) return named
    if (language === 'en') return `${named} on ${on.kind} ${on.siglum}`
    return `${named} ${on.kind === 'version' ? 'in' : 'auf'} ${kindIn(language, on.kind)} ${on.siglum}`
}

/** Who answers for the edition: its editors, or where it names none, its publisher. */
const editorsOf = (edition: Edition): string[] => {
    const editors = (edition.creation.editors ?? [])
        .filter(editor => editor.role === 'editor' && editor.name.trim())
        .map(editor => editor.name.trim())
    if (editors.length > 0) return editors

    const publisher = edition.creation.publisher.name.trim()
    return publisher ? [publisher] : []
}

/** "A", "A and B", "A, B and C". */
const listed = (names: string[], and: string) =>
    names.length > 1 ? `${names.slice(0, -1).join(', ')} ${and} ${names.at(-1)}` : names.join('')

/** "2 October 2026" */
const englishDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** "2.10.2026" */
const germanDate = (date: Date) => `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`

const phrases = {
    en: {
        edition: 'Roll edition',
        of: (catalogueNumber: string) => `of ${catalogueNumber}`,
        editedBy: (names: string[]) => `edited by ${listed(names, 'and')}`,
        version: (version: string, date: Date) => `version ${version} of ${englishDate(date)}`,
        published: (date: Date) => `published ${englishDate(date)}`,
        commit: (sha: string) => `commit ${sha}`,
        accessed: (date: Date) => `accessed ${englishDate(date)}`
    },
    de: {
        edition: 'Rollenedition',
        of: (catalogueNumber: string) => `von ${catalogueNumber}`,
        editedBy: (names: string[]) => `hrsg. von ${listed(names, 'und')}`,
        version: (version: string, date: Date) => `Version ${version} vom ${germanDate(date)}`,
        published: (date: Date) => `veröffentlicht am ${germanDate(date)}`,
        commit: (sha: string) => `Commit ${sha}`,
        accessed: (date: Date) => `zuletzt abgerufen am ${germanDate(date)}`
    }
} satisfies Record<Language, unknown>

/** The sentence ends, unless the text ends a sentence already. */
const closed = (text: string) => /[.!?]$/.test(text) ? text : `${text}.`

/**
 * "Version R2, in: Alfred Grünfeld spielt Robert Schumann, Träumerei.
 * Rollenedition von WM 225, hrsg. von Niels Pfeffer, Version 1.0 vom
 * 2.10.2026 (Commit 3e1c9a4), https://welte225.org/19fd4209 (zuletzt
 * abgerufen am 2.10.2026)."
 */
export const citationIn = (language: Language, { edition, part, url, commit, accessed }: Citation): string => {
    const say = phrases[language]
    const catalogueNumber = edition.roll.catalogueNumber.trim()
    const editors = editorsOf(edition)
    const date = edition.creation.publicationDate

    const state = (edition.version ? say.version(edition.version, date) : say.published(date))
        + (commit ? ` (${say.commit(commit.sha.slice(0, 7))})` : '')

    const details = [
        catalogueNumber ? `${say.edition} ${say.of(catalogueNumber)}` : say.edition,
        editors.length > 0 ? say.editedBy(editors) : undefined,
        state,
        url
    ].filter(Boolean).join(', ')

    return `${part ? `${partIn(language, part)}, in: ` : ''}${closed(edition.title.trim())} ${details} (${say.accessed(accessed)}).`
}
