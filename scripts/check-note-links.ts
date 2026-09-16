/**
 * Holds the links in the notes against what they point at.
 *
 * Two things can go wrong once a note links to a punching. The figure it
 * still names can drift from where the punching lies. And the link can
 * sit on the wrong punching altogether: the note on R3 pointed at G1's
 * crescendo at 2464,05 mm instead of R3's own at 2463,31, because the
 * nearer one won. A note that argues about one version and quietly links
 * a punching of another, without ever naming that version, is the shape
 * of that mistake.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/check-note-links.ts [Toleranz in mm]
 */

import { AnySymbol, EditionView, importJsonLd, insertedBy, migrate, partsOfNote, siglaOf } from 'linked-rolls'
import { Json, readEdition } from './storedEdition'

/** What rounding to a whole millimetre can account for. Beyond it, a figure wants looking at. */
const TOLERANCE = Number(process.argv[2] ?? 0.6)

const document = readEdition()
const view = new EditionView(importJsonLd(migrate(structuredClone(document))))
const sigla = siglaOf(view.edition)

const describe = (symbol: AnySymbol) =>
    'expressionType' in symbol ? `${symbol.expressionType} ${symbol.scope ?? ''}`.trim()
        : 'pitch' in symbol ? `Ton ${symbol.pitch}` : symbol.type

interface Punching {
    at?: number
    what: string
    /** The version that inserts it, by siglum. */
    version: string
    versionId: string
}

const punchings = new Map<string, Punching>(view.edition.versions.flatMap(version =>
    insertedBy(version).map(symbol => [symbol.id, {
        at: view.placeOf(symbol)?.from,
        what: describe(symbol),
        version: sigla.get(version.id) ?? version.id,
        versionId: version.id
    }] as const)))

/** The version a note sits on, where its path says one. */
const homeOf = (path: string[]) => {
    const [collection, index] = path
    if (collection !== 'versions') return undefined
    const version = document.versions[Number(index)]
    return version && { id: version['@id'] as string, siglum: sigla.get(version['@id']) ?? '?' }
}

const drifted: string[] = []
const foreign: string[] = []
const dangling: string[] = []
let links = 0

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) return node.forEach((item, index) => walk(item, [...path, String(index)]))
    if (node === null || typeof node !== 'object') return

    Object.entries(node as Json).forEach(([key, value]) => {
        if (key !== 'note' || typeof value !== 'string') return walk(value, [...path, key])

        const where = path.join('/')
        const home = homeOf(path)
        const parts = partsOfNote(value)
        const named = new Set(parts.flatMap(part => part.type === 'reference' ? [part.id] : []))

        parts.forEach(part => {
            if (part.type !== 'reference' || !part.id.startsWith('symbol_')) return
            links += 1

            const punching = punchings.get(part.id)
            if (!punching) return dangling.push(`${where}: „${part.label ?? part.id}“ zeigt auf nichts`)

            const figure = part.label?.match(/([\d,]+)\s*mm/)?.[1]
            if (figure !== undefined && punching.at !== undefined) {
                const drift = Math.abs(punching.at - Number(figure.replace(',', '.')))
                if (drift > TOLERANCE) {
                    drifted.push(`${where}: „${part.label}“ liegt bei ${punching.at.toFixed(2)} mm, Abstand ${drift.toFixed(2)}`)
                }
            }

            // A punching of another version is fine where the note argues about
            // that version, and suspect where it never names it.
            if (home && punching.versionId !== home.id && !named.has(punching.versionId)) {
                foreign.push(`${where} (${home.siglum}): „${part.label ?? ''}“ ist eine Stanzung von ${punching.version} (${punching.what})`)
            }
        })
    })
}

walk(document, [])

const report = (title: string, lines: readonly string[]) => {
    console.log(`\n  ${title}: ${lines.length}`)
    lines.forEach(line => console.log(`    ${line}`))
}

console.log(`  ${links} Verweise auf Stanzungen geprüft`)
report('Verweise ins Leere', dangling)
report(`Angaben, die um mehr als ${TOLERANCE} mm abweichen`, drifted)
report('Stanzungen einer Fassung, die die Notiz nicht nennt', foreign)

if (dangling.length + drifted.length + foreign.length > 0) process.exit(1)
