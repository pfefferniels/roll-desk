/**
 * How the edition, or something in it, is cited: by its IRI, under the
 * version the edition states of itself and the commit whose file the
 * reader saw. The version is what a reader names, the commit what
 * gives back exactly what they saw, since the edition goes on changing
 * between versions.
 */

import { copyIn, Edition, getAt, pathIn, versionIn } from "linked-rolls"
import { linkTarget } from "./addresses"
import { isMotivation } from "./motivation"
import { copyLabel, versionLabel } from "./names"
import type { Commit } from "./publication"

export interface Citation {
    edition: Edition
    /** What is cited within the edition, or nothing where it is the edition as a whole. */
    part?: string
    /** The IRI of what is cited. */
    iri: string
    /** The commit holding what the reader saw, where it is known. */
    commit?: Commit
    /** The day the reader saw it. */
    accessed: Date
}

/** The kind of an entity, as its type names it: `HoleChain` is a hole chain. */
const kindOf = (entity: unknown): string => {
    if (isMotivation(entity)) return 'Motivation'
    const type = typeof entity === 'object' && entity !== null && 'type' in entity && typeof entity.type === 'string'
        ? entity.type
        : undefined
    if (!type) return 'Entity'
    const words = type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
    return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * What a citation calls the entity under the id: a version or a copy by
 * its siglum, anything else by its kind and where it stands.
 */
export const partNamed = (edition: Edition, id: string): string | undefined => {
    if (versionIn(edition, id)) return `Version ${versionLabel(edition, id)}`

    const copy = copyIn(edition, id)
    if (copy) return `Copy ${copyLabel(copy)}`

    const path = pathIn(edition, id)
    const target = linkTarget(edition, id)
    if (!path || !target) return undefined

    const kind = kindOf(getAt<unknown>(path, edition))
    if (target.on === 'version') return `${kind} on version ${versionLabel(edition, target.versionId)}`
    if (target.on === 'copy') {
        const on = copyIn(edition, target.copyId)
        return on ? `${kind} on copy ${copyLabel(on)}` : kind
    }
    return kind
}

/** Who answers for the edition: its editors, or where it names none, its publisher. */
const responsible = (edition: Edition): { names: string[], asEditors: boolean } => {
    const editors = (edition.creation.editors ?? [])
        .filter(editor => editor.role === 'editor' && editor.name.trim())
        .map(editor => editor.name.trim())
    if (editors.length > 0) return { names: editors, asEditors: true }

    const publisher = edition.creation.publisher.name.trim()
    return { names: publisher ? [publisher] : [], asEditors: false }
}

/** What the edition is, beside its title. */
const subtitleOf = (edition: Edition) => {
    const catalogueNumber = edition.roll.catalogueNumber.trim()
    return catalogueNumber ? `Roll edition of ${catalogueNumber}` : 'Roll edition'
}

/** The commit as a reader can look it up. */
const shortSha = (commit: Commit) => commit.sha.slice(0, 7)

/** "2 October 2026" */
export const longDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-02", of the day as the edition holds it. */
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** The sentence ends, unless the text ends a sentence already. */
const closed = (text: string) => /[.!?]$/.test(text) ? text : `${text}.`

/**
 * "Version L1, in: Niels Pfeffer (ed.): Alfred Grünfeld spielt Robert
 * Schumann, Träumerei. Roll edition of WM 225, version 1.0 of 2 October
 * 2026 (commit fc71626), https://welte225.org/…, accessed 2 October 2026."
 */
export const asText = ({ edition, part, iri, commit, accessed }: Citation): string => {
    const { names, asEditors } = responsible(edition)
    const by = names.length > 0
        ? `${names.join(', ')}${asEditors ? (names.length > 1 ? ' (eds.)' : ' (ed.)') : ''}: `
        : ''

    const published = longDate(edition.creation.publicationDate)
    const state = [
        subtitleOf(edition),
        edition.version ? `version ${edition.version} of ${published}` : `published ${published}`
    ].join(', ') + (commit ? ` (commit ${shortSha(commit)})` : '')

    return [
        part ? `${part}, in: ` : '',
        by,
        closed(edition.title.trim()),
        ' ',
        `${state}, ${iri}, accessed ${longDate(accessed)}.`
    ].join('')
}

/** A key for the entry: the catalogue number, and the start of the id of the part cited. */
const keyOf = ({ edition, iri }: Citation) => {
    const id = iri.startsWith(edition.base) ? iri.slice(edition.base.length) : ''
    return [edition.roll.catalogueNumber || 'edition', id.slice(0, 8)]
        .filter(Boolean)
        .join('-')
        .replace(/[^A-Za-z0-9_:-]/g, '')
}

/** Text as BibTeX reads it, its special characters escaped. */
const bibEscaped = (text: string) =>
    text
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/([{}&%$#_])/g, '\\$1')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}')

/** The commit as a note says where to find it. */
const commitNote = (commit: Commit) => `Commit ${shortSha(commit)} of github.com/${commit.repository}`

/** A BibLaTeX entry of type `@dataset`, the part cited as its title addon. */
export const asBibLaTeX = (citation: Citation): string => {
    const { edition, part, iri, commit, accessed } = citation
    const { names, asEditors } = responsible(edition)
    const publisher = edition.creation.publisher.name.trim()

    const fields: [string, string | undefined][] = [
        [asEditors ? 'editor' : 'author', names.length > 0 ? names.map(bibEscaped).join(' and ') : undefined],
        ['title', bibEscaped(edition.title.trim())],
        ['subtitle', bibEscaped(subtitleOf(edition))],
        ['titleaddon', part && bibEscaped(part)],
        ['version', edition.version && bibEscaped(edition.version)],
        ['date', isoDate(edition.creation.publicationDate)],
        ['publisher', publisher ? bibEscaped(publisher) : undefined],
        ['url', iri],
        ['urldate', isoDate(accessed)],
        ['note', commit && bibEscaped(commitNote(commit))]
    ]

    const lines = fields
        .filter((field): field is [string, string] => !!field[1])
        .map(([name, value]) => `  ${name} = {${value}},`)

    return [`@dataset{${keyOf(citation)},`, ...lines, '}'].join('\n')
}

/** "2026/10/02", as RIS writes a date. */
const risDate = (date: Date) => isoDate(date).replace(/-/g, '/')

/** An RIS record of type DATA: the part cited as its title and the edition as the work it stands in. */
export const asRis = ({ edition, part, iri, commit, accessed }: Citation): string => {
    const { names, asEditors } = responsible(edition)
    const publisher = edition.creation.publisher.name.trim()
    const title = `${edition.title.trim()}: ${subtitleOf(edition)}`

    const tags: [string, string | undefined][] = [
        ['TY', 'DATA'],
        ...names.map((name): [string, string] => [asEditors ? 'ED' : 'AU', name]),
        ['TI', part ?? title],
        ['T2', part ? title : undefined],
        ['ET', edition.version],
        ['PY', String(edition.creation.publicationDate.getFullYear())],
        ['DA', risDate(edition.creation.publicationDate)],
        ['PB', publisher || undefined],
        ['UR', iri],
        ['Y2', risDate(accessed)],
        ['N1', commit && commitNote(commit)],
        ['ER', '']
    ]

    return tags
        .filter((tag): tag is [string, string] => tag[1] !== undefined)
        .map(([tag, value]) => `${tag}  - ${value}`)
        .join('\n') + '\n'
}
