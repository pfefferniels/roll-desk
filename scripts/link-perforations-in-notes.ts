/**
 * Makes the millimetre figures in the notes into links. A figure that
 * names a place on the roll becomes `{{<id>|7364,7 mm}}`, so that a
 * reader can open the perforation the sentence is about; the prose around
 * it is untouched.
 *
 * Only a figure that one symbol answers to within the tolerance is
 * linked. Where several answer or none does, the figure stays as it is
 * and the report says so, because guessing which perforation a sentence
 * means is the editor's to do, not the script's.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/link-perforations-in-notes.ts [--write]
 */

import { AnySymbol, EditionView, importJsonLd, insertedBy, migrate, NotePart, partsOfNote, siglaOf } from "linked-rolls"
import { finish, Json, readEdition, structuralProblems } from './storedEdition'

/** How near a symbol has to sit for a figure to name it. The notes give 0,1 mm. */
const TOLERANCE = 0.6

/** Below this the figure is a width, a median or a tolerance, not a place on the roll. */
const SHORTEST_PLACE = 500

const document = readEdition()
const view = new EditionView(importJsonLd(migrate(structuredClone(document))))

interface Placed {
    symbol: AnySymbol
    at: number
}

const placed: Placed[] = view.edition.versions
    .flatMap(version => insertedBy(version))
    .flatMap(symbol => {
        const place = view.placeOf(symbol)
        return place === undefined ? [] : [{ symbol, at: place.from }]
    })

const describe = (symbol: AnySymbol) =>
    'expressionType' in symbol ? `${symbol.expressionType} ${symbol.scope ?? ''}`.trim()
        : 'pitch' in symbol ? `Ton ${symbol.pitch}` : symbol.type

/** A figure as the notes write it, and as a number. */
const figure = /(\d{3,}(?:,\d+)?) mm/g

/**
 * Where two punchings sit at one figure, the sentence says which it
 * means. These six were read off the wording and confirmed against the
 * versions; a figure not named here is still left to the editor.
 */
interface Decision {
    written: string
    /** The function the sentence names. */
    type: string
    /** The version the sentence points at, where the type alone does not tell them apart. */
    version?: string
}

const DECIDED: readonly Decision[] = [
    { written: '6250,4 mm', type: 'SoftPedalOn' },
    { written: '5159 mm', type: 'SlowCrescendoOn' },
    { written: '4287 mm', type: 'ForzandoOff' },
    { written: '4050 mm', type: 'ForzandoOn' },
    { written: '2872,9 mm', type: 'SlowCrescendoOn', version: 'R1' },
    { written: '5582,7 mm', type: 'SlowCrescendoOn', version: 'R1' }
]

const sigla = siglaOf(view.edition)

/** Which version inserts the symbol, by siglum. */
const versionOf = (symbol: AnySymbol) => {
    const holder = view.edition.versions.find(version => insertedBy(version).some(one => one.id === symbol.id))
    return holder && sigla.get(holder.id)
}

const report: string[] = []
const problems: string[] = []
const unresolved: string[] = []
let linked = 0

/** A reference as it is written, so that one already laid down is left alone. */
const written = (part: NotePart) =>
    part.type === 'text' ? part.text : `{{${part.id}${part.label ? `|${part.label}` : ''}}}`

/**
 * The note with every figure that one symbol answers to turned into a
 * link. A figure inside a reference already made is passed over, so that
 * running this again lays no link inside a link.
 */
const withLinks = (note: string, where: string): string =>
    partsOfNote(note)
        .map(part => part.type === 'text' ? linkFigures(part.text, where) : written(part))
        .join('')

const linkFigures = (text: string, where: string): string =>
    text.replace(figure, (whole, written: string) => {
        const at = Number(written.replace(',', '.'))
        if (at < SHORTEST_PLACE) return whole

        const all = placed.filter(candidate => Math.abs(candidate.at - at) <= TOLERANCE)
        if (all.length === 0) {
            unresolved.push(`${where}: ${whole} – keine Stanzung an dieser Stelle`)
            return whole
        }

        const decision = all.length > 1 ? DECIDED.find(one => one.written === whole) : undefined
        const near = decision
            ? all.filter(one => 'expressionType' in one.symbol && one.symbol.expressionType === decision.type
                && (decision.version === undefined || versionOf(one.symbol) === decision.version))
            : all

        if (near.length !== 1) {
            unresolved.push(`${where}: ${whole} – ${all.length} Stanzungen (${all.map(one => describe(one.symbol)).join(', ')})`)
            return whole
        }

        linked += 1
        return `{{${near[0]!.symbol.id}|${whole}}}`
    })

const walk = (node: unknown, path: string[]) => {
    if (Array.isArray(node)) node.forEach((item, index) => walk(item, [...path, String(index)]))
    else if (node !== null && typeof node === 'object') {
        Object.entries(node as Json).forEach(([key, value]) => {
            if (key !== 'note' || typeof value !== 'string') return walk(value, [...path, key])

            const next = withLinks(value, path.join('/'))
            if (next !== value) {
                (node as Json)[key] = next
                report.push(`${path.join('/')}: ${(next.match(/\{\{[^}|]+\|/g) ?? []).length} Stanzung(en) verlinkt`)
            }
        })
    }
}

walk(document, [])

report.push(`${linked} Millimeterangaben verlinkt, ${unresolved.length} offen`)
unresolved.forEach(line => report.push(`  offen – ${line}`))

finish(document, report, [...problems, ...structuralProblems(document)])
