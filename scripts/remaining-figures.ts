/**
 * Every figure still standing in the prose of a note, with the punchings
 * that sit near it. Text inside a reference is skipped, since that is
 * already a link.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/remaining-figures.ts
 */

import { AnySymbol, EditionView, importJsonLd, insertedBy, migrate, partsOfNote, siglaOf } from 'linked-rolls'
import { Json, readEdition } from './storedEdition'

/** The tolerance the R3 note states for itself, which is the loosest the edition uses. */
const REACH = 3.3

const document = readEdition()
const view = new EditionView(importJsonLd(migrate(structuredClone(document))))
const sigla = siglaOf(view.edition)

const describe = (symbol: AnySymbol) =>
    'expressionType' in symbol ? `${symbol.expressionType} ${symbol.scope ?? ''}`.trim()
        : 'pitch' in symbol ? `Ton ${symbol.pitch}` : symbol.type

const placed = view.edition.versions.flatMap(version =>
    insertedBy(version).flatMap(symbol => {
        const at = view.placeOf(symbol)
        return at === undefined ? [] : [{
            symbol, at: at.from, version: sigla.get(version.id) ?? version.id
        }]
    }))

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) return node.forEach((item, index) => walk(item, [...path, String(index)]))
    if (node === null || typeof node !== 'object') return

    Object.entries(node as Json).forEach(([key, value]) => {
        if (key !== 'note' || typeof value !== 'string') return walk(value, [...path, key])

        const prose = partsOfNote(value).map(part => part.type === 'text' ? part.text : ' ').join('')
        const figures = [...prose.matchAll(/(\d{3,}(?:,\d+)?)/g)].map(match => match[1]!)
        if (figures.length === 0) return

        console.log(`\n${path.join('/')}`)
        figures.forEach(figure => {
            const target = Number(figure.replace(',', '.'))
            const near = placed
                .filter(candidate => Math.abs(candidate.at - target) <= REACH)
                .sort((one, other) => Math.abs(one.at - target) - Math.abs(other.at - target))
            console.log(`  ${figure.padStart(8)}  ${near.length === 0 ? '— nichts' :
                near.slice(0, 3).map(one => `${one.version}/${describe(one.symbol)}@${one.at.toFixed(1)}`).join('  ')}`)
        })
    })
}

walk(document, [])
