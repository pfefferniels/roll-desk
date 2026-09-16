/**
 * Prints every note of the stored edition with its place and its length,
 * the references resolved to the sigla a reader sees.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/dump-notes.ts [Pfadmuster]
 */

import { EditionView, importJsonLd, migrate, resolveNote } from 'linked-rolls'
import { copyLabel, nameOf } from '../src/helpers/names'
import { Json, readEdition } from './storedEdition'

const document = readEdition()
const view = new EditionView(importJsonLd(migrate(structuredClone(document))))

const label = (id: string) => {
    const copy = view.edition.copies.find(candidate => candidate.id === id)
    return copy ? copyLabel(copy) : nameOf(view, id)
}

const notes: { path: string, note: string }[] = []

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) node.forEach((item, index) => walk(item, [...path, String(index)]))
    else if (node !== null && typeof node === 'object') {
        Object.entries(node as Json).forEach(([key, value]) =>
            key === 'note' && typeof value === 'string'
                ? notes.push({ path: path.join('/'), note: value })
                : walk(value, [...path, key]))
    }
}

walk(document, [])

/** Which version or copy the note sits on, as far as the path says. */
const whereOf = (path: string): string => {
    const [collection, index] = path.split('/')
    const entity = collection === 'versions' ? document.versions[Number(index)]
        : collection === 'copies' ? document.copies[Number(index)]
            : undefined
    return entity ? label(entity['@id']) ?? entity['@id'] : collection ?? '?'
}

const pattern = process.argv[2]

notes
    .filter(({ path }) => !pattern || path.includes(pattern))
    .forEach(({ path, note }) => {
        const shown = resolveNote(note, label)
        console.log(`\n${'─'.repeat(78)}\n${whereOf(path)}  ·  ${path}  ·  ${shown.length} Zeichen`)
        console.log(shown)
    })
