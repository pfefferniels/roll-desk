/**
 * Writes every note of the stored edition as JSON, for the review page.
 * References are shown by siglum ({{R4}}) rather than by id, so that the
 * text can be read and edited; `sigla` maps them back.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/notes-json.ts > notes.json
 */

import { EditionView, importJsonLd, migrate } from 'linked-rolls'
import { copyLabel, nameOf } from '../src/helpers/names'
import { Json, readEdition } from './storedEdition'

const document = readEdition()
const view = new EditionView(importJsonLd(migrate(structuredClone(document))))

const label = (id: string) => {
    const copy = view.edition.copies.find(candidate => candidate.id === id)
    return copy ? copyLabel(copy) : nameOf(view, id)
}

/** Every version a note can refer to, by siglum. */
const sigla = Object.fromEntries(view.edition.versions.map(version => [label(version.id) ?? version.id, version.id]))

const bySiglum = (note: string) =>
    note.replace(/\{\{([^}]+)\}\}/g, (whole, id: string) => `{{${label(id) ?? id}}}`)

const notes: Json[] = []

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) node.forEach((item, index) => walk(item, [...path, String(index)]))
    else if (node !== null && typeof node === 'object') {
        Object.entries(node as Json).forEach(([key, value]) =>
            key === 'note' && typeof value === 'string'
                ? notes.push({ path: path.join('/'), where: whereOf(path), kind: kindOf(path), text: bySiglum(value) })
                : walk(value, [...path, key]))
    }
}

/** Which version or copy the note sits on. */
function whereOf(path: string[]): string {
    const [collection, index] = path
    const entity = collection === 'versions' ? document.versions[Number(index)]
        : collection === 'copies' ? document.copies[Number(index)]
            : undefined
    return entity ? label(entity['@id']) ?? entity['@id'] : 'Edition'
}

/** What kind of statement the note stands under, as a reader would name it. */
function kindOf(path: string[]): string {
    const at = path.join('/')
    if (at.includes('/basedOn/')) return 'Ableitung'
    if (at.includes('/carries/')) return 'Was das Exemplar trägt'
    if (at.includes('/motivations/')) return 'Motivation'
    if (at.includes('/production/date/')) return 'Stanzdatum'
    if (at.includes('/production/speed/')) return 'Tempo'
    if (at.includes('/modifications/')) return 'Eingriff am Exemplar'
    if (at.includes('/conditions/')) return 'Zustand'
    if (at.includes('/readFrom/date/')) return 'Datum der Lesung'
    if (at.includes('/readFrom/instrument/')) return 'Instrument'
    if (at.endsWith('readFrom')) return 'Quelle der Lesung'
    if (at.includes('/creation/')) return 'Herstellung'
    if (at.includes('/alignedWith/')) return 'Bezug einer Stanzung'
    if (at.includes('/edits/')) return 'Bearbeitung'
    if (at.startsWith('@included')) return 'Zitierte Aussage'
    return 'Sonstiges'
}

walk(document, [])

console.log(JSON.stringify({ sigla, notes }, null, 2))
