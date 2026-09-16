/**
 * Prints every note that links to a punching, with each link shown as
 * ⟦Wortlaut = was dort steht⟧, so that the wording can be read against
 * what it points at.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/show-figure-contexts.ts
 */

import { AnySymbol, EditionView, importJsonLd, insertedBy, migrate, partsOfNote } from 'linked-rolls'
import { Json, readEdition } from './storedEdition'

const document = readEdition()
const view = new EditionView(importJsonLd(migrate(structuredClone(document))))

const describe = (symbol: AnySymbol) =>
    'expressionType' in symbol ? `${symbol.expressionType} ${symbol.scope ?? ''}`.trim()
        : 'pitch' in symbol ? `Ton ${symbol.pitch}` : symbol.type

const symbols = new Map(view.edition.versions
    .flatMap(version => insertedBy(version))
    .map(symbol => [symbol.id, describe(symbol)] as const))

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) return node.forEach((item, index) => walk(item, [...path, String(index)]))
    if (node === null || typeof node !== 'object') return

    Object.entries(node as Json).forEach(([key, value]) => {
        if (key !== 'note' || typeof value !== 'string') return walk(value, [...path, key])

        const parts = partsOfNote(value)
        if (!parts.some(part => part.type === 'reference' && part.label)) return

        console.log(`\n── ${path.join('/')}`)
        console.log(parts.map(part => part.type === 'text' ? part.text
            : part.label ? `⟦${part.label} = ${symbols.get(part.id) ?? '?'}⟧` : '{{Fassung}}').join(''))
    })
}

walk(document, [])
