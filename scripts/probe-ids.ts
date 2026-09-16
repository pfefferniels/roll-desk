/**
 * The punchings near each figure given on the command line, with their
 * ids, so that a rewording can point at them.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/probe-ids.ts 1691 1775 …
 */

import { AnySymbol, EditionView, importJsonLd, insertedBy, migrate, siglaOf } from 'linked-rolls'
import { readEdition } from './storedEdition'

const view = new EditionView(importJsonLd(migrate(readEdition())))
const sigla = siglaOf(view.edition)

const describe = (symbol: AnySymbol) =>
    'expressionType' in symbol ? `${symbol.expressionType} ${symbol.scope ?? ''}`.trim()
        : 'pitch' in symbol ? `Ton ${symbol.pitch}` : symbol.type

const placed = view.edition.versions.flatMap(version =>
    insertedBy(version).flatMap(symbol => {
        const at = view.placeOf(symbol)
        return at === undefined ? [] : [{ symbol, at: at.from, version: sigla.get(version.id) ?? version.id }]
    }))

process.argv.slice(2).forEach(written => {
    const target = Number(written.replace(',', '.'))
    console.log(`\n${written} mm`)
    placed
        .filter(candidate => Math.abs(candidate.at - target) <= 3.3)
        .sort((one, other) => Math.abs(one.at - target) - Math.abs(other.at - target))
        .forEach(({ symbol, at, version }) =>
            console.log(`  ${version.padEnd(5)} ${describe(symbol).padEnd(24)} ${at.toFixed(1).padStart(8)}  ${symbol.id.slice(7)}`))
})
