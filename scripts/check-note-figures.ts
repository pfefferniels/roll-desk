/**
 * Holds the millimetre figures in the notes against the punchings they
 * link to.
 *
 * A note says where a punching lies in the author's own words, and the
 * edition knows where it lies. The two can drift apart when a copy is
 * realigned or a reading replaced, and a figure written into prose says
 * nothing about having gone stale. This reports the distance, so that
 * the prose stays the author's and the model still audits it.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/check-note-figures.ts [Toleranz in mm]
 */

import { EditionView, importJsonLd, insertedBy, migrate, partsOfNote } from 'linked-rolls'
import { Json, readEdition } from './storedEdition'

/** What rounding to a whole millimetre can account for. Beyond it, a figure wants looking at. */
const TOLERANCE = Number(process.argv[2] ?? 0.6)

const document = readEdition()
const view = new EditionView(importJsonLd(migrate(structuredClone(document))))

const places = new Map(view.edition.versions
    .flatMap(version => insertedBy(version))
    .flatMap(symbol => {
        const at = view.placeOf(symbol)
        return at === undefined ? [] : [[symbol.id, at.from] as const]
    }))

interface Figure {
    written: string
    at: number
    drift: number
    where: string
}

const figures: Figure[] = []

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) return node.forEach((item, index) => walk(item, [...path, String(index)]))
    if (node === null || typeof node !== 'object') return

    Object.entries(node as Json).forEach(([key, value]) => {
        if (key !== 'note' || typeof value !== 'string') return walk(value, [...path, key])

        partsOfNote(value).forEach(part => {
            if (part.type !== 'reference' || part.label === undefined) return
            const written = Number((part.label.match(/([\d,]+)\s*mm/)?.[1] ?? '').replace(',', '.'))
            const at = places.get(part.id)
            if (at === undefined || Number.isNaN(written)) return
            figures.push({ written: part.label, at, drift: Math.abs(at - written), where: path.join('/') })
        })
    })
}

walk(document, [])

const wide = figures.filter(figure => figure.drift > TOLERANCE)

figures
    .sort((one, other) => other.drift - one.drift)
    .forEach(({ written, at, drift }) =>
        console.log(`  ${written.padEnd(12)} steht bei ${at.toFixed(2).padStart(9)} mm   Abstand ${drift.toFixed(2)}`))

console.log(`\n  ${figures.length} verlinkte Angaben, größter Abstand ${Math.max(...figures.map(f => f.drift)).toFixed(2)} mm`)

if (wide.length > 0) {
    console.log(`\n  Über ${TOLERANCE} mm hinaus:`)
    wide.forEach(({ written, where }) => console.log(`    ${written} in ${where}`))
    process.exit(1)
}

console.log(`  Keine Angabe weicht um mehr als ${TOLERANCE} mm ab.`)
