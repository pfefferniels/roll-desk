/**
 * Writes every note of the stored edition as JSON, for the review page.
 * References are shown by siglum ({{R4}}) rather than by id, so that the
 * text can be read and edited; `sigla` maps them back.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/notes-json.ts > notes.json
 */

import { AnySymbol, EditionView, importJsonLd, migrate } from 'linked-rolls'
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

/**
 * A perforation has no name to stand in the editor either, and its id is
 * a line of its own, so each one a note refers to gets a short alias.
 */
const aliases: Record<string, string> = {}
/** What each alias points at, so that the page can say it rather than leave a bare p15. */
const targets: Record<string, string> = {}

const describe = (id: string) => {
    const symbol = view.get<AnySymbol>(id)
    if (!symbol) return 'nicht gefunden'
    const what = 'expressionType' in symbol ? `${symbol.expressionType} ${symbol.scope ?? ''}`.trim()
        : 'pitch' in symbol ? `Ton ${symbol.pitch}` : symbol.type
    const at = view.placeOf(symbol)
    return at === undefined ? what : `${what}, ${at.from.toFixed(1).replace('.', ',')} mm`
}

const aliasFor = (id: string) => {
    const known = Object.entries(aliases).find(([, held]) => held === id)?.[0]
    if (known) return known
    const alias = `p${Object.keys(aliases).length + 1}`
    aliases[alias] = id
    targets[alias] = describe(id)
    return alias
}

/** The note as the editor shows it: versions by siglum, everything else by alias. */
const readable = (note: string) =>
    note.replace(/\{\{([^}|]+)(\|[^}]*)?\}\}/g, (whole, id: string, label_: string | undefined) =>
        label_ === undefined ? `{{${label(id) ?? id}}}` : `{{${aliasFor(id)}${label_}}}`)

const notes: Json[] = []

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) node.forEach((item, index) => walk(item, [...path, String(index)]))
    else if (node !== null && typeof node === 'object') {
        Object.entries(node as Json).forEach(([key, value]) =>
            key === 'note' && typeof value === 'string'
                ? notes.push({ path: path.join('/'), where: whereOf(path), kind: kindOf(path), text: readable(value) })
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

console.log(JSON.stringify({ sigla, aliases, targets, notes }, null, 2))
