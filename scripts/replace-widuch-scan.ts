/**
 * Replaces the Widuch copy of WM 225 in public/roll.json by the copy
 * read from a fresh scan analysis, keeping the version tree intact.
 *
 *     npx vite-node scripts/replace-widuch-scan.ts <analysis.txt> [--write]
 *
 * The copy keeps its identity, location, production and modifications;
 * only its features, measurements, scan and alignment are new. Every
 * symbol that the old copy's holes carried is given the hole of the new
 * scan that lies where the symbol lies, so that versions A and A1 refer
 * to the new copy just as they referred to the old one. A symbol that
 * only the old scan attested and the new scan does not show leaves the
 * tree, together with any edit whose only work was to delete it. All
 * of this is reported, as are the holes of the new scan that carry no
 * symbol.
 *
 * Without --write the script only reports.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import {
    alignFeatures,
    applyShift,
    applyStretch,
    assignObject,
    Hole,
    readFromStanfordAton,
    RollCopy,
    TrackMeaning,
    validate,
    welteT100
} from 'linked-rolls'

const ROLL_JSON = new URL('../public/roll.json', import.meta.url)
const REPORT = new URL('./replace-widuch-scan.md', import.meta.url)
const OLD_COPY_ID = 'a7ff95b7-f43a-4341-ba86-80fa4e84499c'
const REFERENCE_COPY_ID = 'd229954b-086c-44d6-a589-aaa324d31d88'
const SCAN = '/facsimiles/WR0225_02'
const WITNESSED_VERSION = 'A1'

type Json = Record<string, any>

interface Span { from: number, to: number }

interface Alignment { shift: number, stretch: number }

interface Match {
    symbol: Json
    hole: Hole
    distance: number
    pass: string
}

const [analysisPath, flag] = process.argv.slice(2)
if (!analysisPath) {
    console.error('usage: npx vite-node scripts/replace-widuch-scan.ts <analysis.txt> [--write]')
    process.exit(1)
}

const edition: Json = JSON.parse(readFileSync(ROLL_JSON, 'utf8'))
const tolerance: Span = {
    from: edition.creation.collationTolerance.toleranceStart,
    to: edition.creation.collationTolerance.toleranceEnd
}

const copies: Json[] = edition.copies
const oldCopy = copies.find(copy => copy['@id'] === OLD_COPY_ID)!
const reference = copies.find(copy => copy['@id'] === REFERENCE_COPY_ID)!

// --- the new copy ---------------------------------------------------------

const fresh = readFromStanfordAton(readFileSync(analysisPath, 'utf8'), { scan: SCAN })

const asInternalFeature = (feature: Json) => ({
    ...feature,
    type: feature['@type'],
    id: feature['@id']
})

const isNote = (hole: Hole) => welteT100.meaningOf(hole.vertical.from)?.type === 'note'

const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const spread = (values: number[]) => {
    const centre = median(values)
    return median(values.map(value => Math.abs(value - centre)))
}

const holesOf = (copy: RollCopy) => copy.features.filter((f): f is Hole => f.type === 'Hole')

const placing = ({ shift, stretch }: Alignment) => (x: number) => (x + shift) * stretch

/**
 * Each note onset of a copy, placed by an alignment, paired with the
 * nearest onset on the same track of another copy within a window.
 */
const pairedOnsets = (copy: Hole[], target: Hole[], place: (x: number) => number, window: number) => {
    const byTrack = Map.groupBy(target.filter(isNote), hole => hole.vertical.from)
    return copy
        .filter(isNote)
        .flatMap(hole => {
            const x = hole.horizontal.from
            const nearest = (byTrack.get(hole.vertical.from) ?? [])
                .map(other => ({ y: other.horizontal.from, distance: Math.abs(other.horizontal.from - place(x)) }))
                .sort((a, b) => a.distance - b.distance)[0]
            return nearest && nearest.distance <= window ? [{ x, y: nearest.y }] : []
        })
}

const leastSquares = (points: { x: number, y: number }[]) => {
    const n = points.length
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / n
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / n
    const slope = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0)
        / points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0)
    return { slope, intercept: meanY - slope * meanX }
}

const steps = (from: number, to: number, step: number) =>
    Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

/**
 * The shift and stretch, tried on a grid around a first guess, that
 * land the most note onsets within 3 mm of an onset on the same track
 * of the other copy. The desk's own fit, through the first and last
 * tenth of the onsets, is only the centre of the search: it goes
 * astray when the two scans do not start and end at the same notes.
 */
const coarseAlignment = (copy: Hole[], target: Hole[], around: Alignment): Alignment => {
    const candidates = steps(0.95, 1.05, 0.001).flatMap(stretch =>
        steps(around.shift - 500, around.shift + 500, 2).map(shift => ({ shift, stretch }))
    )
    const scored = candidates.map(guess => ({
        guess,
        score: pairedOnsets(copy, target, placing(guess), 3).length
    }))
    return scored.reduce((best, entry) => entry.score > best.score ? entry : best).guess
}

/**
 * Fits every onset a guess pairs up, and repeats on the pairs the
 * better fit gives, closing the window as it goes.
 */
const refinedAlignment = (copy: Hole[], target: Hole[]) => {
    const first = alignFeatures(copy, target)
    const coarse = coarseAlignment(copy, target, first)
    const refine = (guess: Alignment, window: number) => {
        const pairs = pairedOnsets(copy, target, placing(guess), window)
        const { slope, intercept } = leastSquares(pairs)
        return { stretch: slope, shift: intercept / slope, pairs: pairs.length }
    }
    const final = [10, 5, 3].reduce(refine, { ...coarse, pairs: 0 })
    const residuals = pairedOnsets(copy, target, placing(final), 5)
        .map(({ x, y }) => y - placing(final)(x))
    return { first, coarse, final, residuals }
}

const referenceHoles = holesOf({ ...reference, features: reference.features.map(asInternalFeature) } as RollCopy)
const alignment = refinedAlignment(holesOf(fresh), referenceHoles)

const newCopy: RollCopy = {
    ...fresh,
    id: oldCopy['@id'],
    location: oldCopy.location,
    ops: [],
    conditions: [],
}

applyShift({ horizontal: alignment.final.shift, vertical: 0 }, newCopy)
applyStretch(assignObject({
    type: 'paper-stretch' as const,
    factor: alignment.final.stretch,
    description: 'calculated by alignment'
}), newCopy)

// --- the symbols the copy witnesses -------------------------------------

const versions: Json[] = edition.versions
const versionsById = new Map(versions.map(version => [version['@id'], version]))

/** Every symbol in force at a version. */
const snapshot = (siglum: string): Json[] => {
    const chain: Json[] = []
    let version = versions.find(v => v.siglum === siglum)
    while (version) {
        chain.unshift(version)
        version = versionsById.get(version.basedOn?.['@id'])
    }

    const inForce = new Map<string, Json>()
    chain.flatMap(version => version.edits).forEach(edit => {
        (edit.delete ?? []).forEach((id: string) => inForce.delete(id))
        ;(edit.insert ?? []).forEach((symbol: Json) => inForce.set(symbol['@id'], symbol))
    })
    return [...inForce.values()]
}

const allSymbols: Json[] = versions.flatMap(version => version.edits.flatMap((edit: Json) => edit.insert ?? []))
const insertedIn = new Map<Json, string>(versions.flatMap(version =>
    version.edits.flatMap((edit: Json) => (edit.insert ?? []).map((symbol: Json) => [symbol, version.siglum] as const))
))
const deletesOf = () => versions.flatMap(version => version.edits.flatMap((edit: Json) => edit.delete ?? []))
const danglingBefore = deletesOf().filter((id: string) => !allSymbols.some(s => s['@id'] === id))

const oldFeatures = new Map<string, Json>(oldCopy.features.map((f: Json) => [f['@id'], f]))
const otherFeatures = new Map<string, Json>(
    copies
        .filter(copy => copy !== oldCopy)
        .flatMap(copy => copy.features.map((f: Json) => [f['@id'], f]))
)

const isOldCarrier = (carrier: Json) => oldFeatures.has(carrier['@id'])

const meaningOf = (symbol: Json): TrackMeaning | undefined =>
    symbol['@type'] === 'note'
        ? { type: 'note', pitch: symbol.pitch }
        : symbol['@type'] === 'expression'
            ? { type: 'expression', expressionType: symbol.expressionType, scope: symbol.scope }
            : undefined

const describe = (meaning: TrackMeaning | undefined) =>
    !meaning ? '?' : meaning.type === 'note' ? `note ${meaning.pitch}` : `${meaning.scope} ${meaning.expressionType}`

const meanSpan = (spans: Span[]): Span => ({
    from: spans.reduce((sum, s) => sum + s.from, 0) / spans.length,
    to: spans.reduce((sum, s) => sum + s.to, 0) / spans.length
})

/**
 * Where a symbol lies: by the copies other than the one being replaced
 * when there are any, by the old scan otherwise.
 */
const anchorOf = (symbol: Json): Span | undefined => {
    const carriers: Json[] = symbol.carriers
    const others = carriers.flatMap(c => otherFeatures.get(c['@id']) ?? [])
    const olds = carriers.flatMap(c => oldFeatures.get(c['@id']) ?? [])
    const anchors = (others.length ? others : olds).map(f => f.horizontal as Span)
    return anchors.length ? meanSpan(anchors) : undefined
}

const distance = (a: Span, b: Span) => Math.max(Math.abs(a.from - b.from), Math.abs(a.to - b.to))

const within = (a: Span, b: Span, scale: number) =>
    Math.abs(a.from - b.from) <= tolerance.from * scale && Math.abs(a.to - b.to) <= tolerance.to * scale

const witnessed = snapshot(WITNESSED_VERSION)
const witnessedIds = new Set(witnessed.map(s => s['@id']))
const carriedByOld = allSymbols.filter(symbol => symbol.carriers.some(isOldCarrier))
const toMatch = [...new Set([...witnessed, ...carriedByOld])]

const anchors = new Map(toMatch.map(symbol => [symbol, anchorOf(symbol)]))
const oldHoleOf = new Map(toMatch.flatMap(symbol => {
    const old = symbol.carriers.map((c: Json) => oldFeatures.get(c['@id'])).find(Boolean)
    return old ? [[symbol, old] as const] : []
}))

const oneToOne = (candidates: Match[]) => {
    const takenSymbols = new Set<Json>()
    const takenHoles = new Set<Hole>()
    return candidates
        .sort((a, b) => a.distance - b.distance)
        .filter(({ symbol, hole }) => {
            if (takenSymbols.has(symbol) || takenHoles.has(hole)) return false
            takenSymbols.add(symbol)
            takenHoles.add(hole)
            return true
        })
}

/** Symbols paired with holes of the same meaning at the same place, nearest first. */
const matchByPlace = (symbols: Json[], holes: Hole[], scale: number, pass: string): Match[] =>
    oneToOne(symbols.flatMap(symbol => {
        const anchor = anchors.get(symbol)
        if (!anchor) return []
        return holes
            .filter(hole => describe(meaningOf(symbol)) === describe(welteT100.meaningOf(hole.vertical.from)))
            .filter(hole => within(anchor, hole.horizontal, scale))
            .map((hole): Match => ({ symbol, hole, distance: distance(anchor, hole.horizontal), pass }))
    }))

/**
 * What is left after matching by place: a symbol and a hole that are
 * each the only one of their meaning belong together wherever they
 * lie, as the rewind perforation does when one scan is cut short.
 */
const matchByMeaning = (symbols: Json[], holes: Hole[], pass: string): Match[] => {
    const symbolsByMeaning = Map.groupBy(symbols, symbol => describe(meaningOf(symbol)))
    const holesByMeaning = Map.groupBy(holes, hole => describe(welteT100.meaningOf(hole.vertical.from)))
    return [...symbolsByMeaning]
        .filter(([meaning, group]) => group.length === 1 && holesByMeaning.get(meaning)?.length === 1)
        .map(([meaning, [symbol]]): Match => {
            const hole = holesByMeaning.get(meaning)![0]
            return { symbol, hole, distance: distance(anchors.get(symbol)!, hole.horizontal), pass }
        })
}

const passes = [
    (symbols: Json[], holes: Hole[]) => matchByPlace(symbols, holes, 1, 'within the collation tolerance'),
    (symbols: Json[], holes: Hole[]) => matchByPlace(symbols, holes, 3, 'within three times the tolerance'),
    (symbols: Json[], holes: Hole[]) => matchByMeaning(symbols, holes, 'the only one of its meaning'),
]

const matches = passes.reduce((found, pass) => {
    const matchedSymbols = new Set(found.map(m => m.symbol))
    const matchedHoles = new Set(found.map(m => m.hole))
    return [...found, ...pass(
        toMatch.filter(s => !matchedSymbols.has(s)),
        holesOf(newCopy).filter(h => !matchedHoles.has(h))
    )]
}, [] as Match[])

const holeOf = new Map(matches.map(m => [m.symbol, m.hole]))
const unmatchedSymbols = toMatch.filter(s => !holeOf.has(s))
const unmatchedHoles = holesOf(newCopy).filter(h => !matches.some(m => m.hole === h))

// --- rewriting ---------------------------------------------------------------

const carriersAdded: Json[] = []
const carriersDropped: Json[] = []

allSymbols.forEach(symbol => {
    const hole = holeOf.get(symbol)
    const carriers: Json[] = symbol.carriers
    const old = carriers.find(isOldCarrier)

    if (old && hole) {
        old['@id'] = hole.id
    } else if (old) {
        symbol.carriers = carriers.filter(c => c !== old)
        carriersDropped.push(symbol)
    } else if (hole) {
        carriers.push({ '@id': hole.id })
        carriersAdded.push(symbol)
    }
})

const withdrawn = allSymbols.filter(symbol => symbol.carriers.length === 0)
const withdrawnIds = new Set(withdrawn.map(s => s['@id']))
const editsTrimmed: string[] = []
const editsEmptied: string[] = []

const describeEdit = (siglum: string, edit: Json) =>
    `${siglum}: edit ${edit['@id']}${edit.motivation ? `, motivation ${edit.motivation}` : ''}${edit.editType ? `, ${edit.editType}` : ''}`

versions.forEach(version => {
    const emptied = version.edits.filter((edit: Json) => {
        const inserts = (edit.insert ?? []).filter((s: Json) => !withdrawnIds.has(s['@id']))
        const deletes = (edit.delete ?? []).filter((id: string) => !withdrawnIds.has(id))
        const trimmed = inserts.length < (edit.insert ?? []).length || deletes.length < (edit.delete ?? []).length
        if (!trimmed) return false

        editsTrimmed.push(`${describeEdit(version.siglum, edit)}, now ${inserts.length} insertion${inserts.length === 1 ? '' : 's'} and ${deletes.length} deletion${deletes.length === 1 ? '' : 's'}`)
        if (edit.insert) edit.insert = inserts
        if (edit.delete) edit.delete = deletes
        return inserts.length + deletes.length === 0
    })
    editsEmptied.push(...emptied.map((edit: Json) => describeEdit(version.siglum, edit)))
    version.edits = version.edits.filter((edit: Json) => !emptied.includes(edit))
})

const asJsonLd = (value: any): any => {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }
    if (Array.isArray(value)) {
        return value.map(asJsonLd)
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, v]) => v !== undefined)
                .map(([key, v]) => [key === 'type' ? '@type' : key === 'id' ? '@id' : key, asJsonLd(v)])
        )
    }
    return value
}

const { type, id, ops, conditions, location, features, measurements, scan, ...rest } = newCopy
const replacement = asJsonLd({
    type, id, ops, conditions, location, features, measurements, scan,
    ...rest,
    production: oldCopy.production,
    modifications: oldCopy.modifications
})
copies.splice(copies.indexOf(oldCopy), 1, replacement)

/** As Python's json.dumps writes it, which is how roll.json has been kept. */
const serialize = (json: Json) =>
    JSON.stringify(json, null, 2)
        .replace(/[\u0080-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)

const output = serialize(edition)

// --- checks -------------------------------------------------------------------

const dangling = [...oldFeatures.keys()].filter(id => output.includes(id))
const newIds = new Set(newCopy.features.map(f => f.id))
const unresolved = allSymbols
    .flatMap(symbol => symbol.carriers.map((c: Json) => c['@id']))
    .filter(id => !otherFeatures.has(id) && !newIds.has(id))
const deletesOfWithdrawn = deletesOf().filter((id: string) => withdrawnIds.has(id))
const danglingAfter = deletesOf().filter((id: string) => !allSymbols.some(s => s['@id'] === id))
const valid = validate(JSON.parse(output))

// --- report -------------------------------------------------------------------

const mm = (value: number) => `${value.toFixed(1)} mm`
const span = (s: Span | undefined) => s ? `${mm(s.from)}–${mm(s.to)}` : '?'
const describeSymbol = (symbol: Json) => {
    const version = insertedIn.get(symbol) ?? '-'
    const others = symbol.carriers.filter((c: Json) => otherFeatures.has(c['@id'])).length
    return `${describe(meaningOf(symbol))} at ${span(anchors.get(symbol))}`
        + ` (${symbol['@id']}, inserted in ${version}, ${others} other carrier${others === 1 ? '' : 's'})`
}
const describeHole = (hole: Hole) =>
    `${describe(welteT100.meaningOf(hole.vertical.from))} at ${span(hole.horizontal)} (track ${hole.vertical.from})`

const deviations = matches.flatMap(m => {
    const old = oldHoleOf.get(m.symbol)
    if (!old) return []
    const length = (s: Span) => s.to - s.from
    return [{
        at: old.horizontal.from,
        from: m.hole.horizontal.from - old.horizontal.from,
        to: m.hole.horizontal.to - old.horizontal.to,
        length: length(m.hole.horizontal) - length(old.horizontal)
    }]
})
const trend = leastSquares(deviations.map(d => ({ x: d.at, y: d.from })))
const summarize = (values: number[]) =>
    `median ${median(values).toFixed(2)} mm, spread ${spread(values).toFixed(2)} mm (MAD), largest ${Math.max(...values.map(Math.abs)).toFixed(1)} mm`

const oldStretch = oldCopy.conditions.find((c: Json) => c['@type'] === 'paper-stretch')?.factor
const holeCount = (copy: Json) => copy.features.filter((f: Json) => f['@type'] === 'Hole').length
const extent = (copy: Json) => span({
    from: Math.min(...copy.features.map((f: Json) => f.horizontal.from)),
    to: Math.max(...copy.features.map((f: Json) => f.horizontal.to))
})

const residuals = alignment.residuals
const report = [
    `# Replacing the Widuch scan`,
    ``,
    `Analysis: ${analysisPath}`,
    ``,
    `## The scans`,
    `| | old | new |`,
    `| --- | --- | --- |`,
    `| image length | ${mm(oldCopy.measurements.dimensions.height)} | ${mm(replacement.measurements.dimensions.height)} |`,
    `| roll width | ${mm(oldCopy.measurements.dimensions.width)} | ${mm(replacement.measurements.dimensions.width)} |`,
    `| hole separation | ${oldCopy.measurements.holeSeparation.value} px | ${replacement.measurements.holeSeparation.value} px |`,
    `| margins bass / treble | ${oldCopy.measurements.margins.bass} / ${oldCopy.measurements.margins.treble} px | ${replacement.measurements.margins.bass} / ${replacement.measurements.margins.treble} px |`,
    `| holes (chains) | ${holeCount(oldCopy)} | ${holeCount(replacement)} |`,
    `| first to last hole, aligned | ${extent(oldCopy)} | ${extent(replacement)} |`,
    `| shift, stretch | ${mm(oldCopy.measurements.shift?.horizontal ?? 0)}, ${oldStretch?.toFixed(5)} | ${mm(alignment.final.shift)}, ${alignment.final.stretch.toFixed(5)} |`,
    ``,
    `## Alignment to the reference copy (${reference.location} ${REFERENCE_COPY_ID.slice(0, 8)})`,
    `- the desk's fit through the first and last tenth of the onsets: shift ${mm(alignment.first.shift)}, stretch ${alignment.first.stretch.toFixed(5)}`,
    `- best on a grid of 2 mm and 0.001 around it: shift ${mm(alignment.coarse.shift)}, stretch ${alignment.coarse.stretch.toFixed(3)}`,
    `- refined over ${alignment.final.pairs} onset pairs: shift ${mm(alignment.final.shift)}, stretch ${alignment.final.stretch.toFixed(5)}`,
    `- onset residuals against the reference, ${residuals.length} pairs within 5 mm: ${summarize(residuals)}`,
    ``,
    `## Old holes against new, for the ${deviations.length} symbols both scans carry`,
    `- onset: ${summarize(deviations.map(d => d.from))}`,
    `- release: ${summarize(deviations.map(d => d.to))}`,
    `- length: ${summarize(deviations.map(d => d.length))}`,
    `- drift of the onset difference along the roll: ${(trend.slope * 1000).toFixed(2)} mm per metre`,
    ``,
    `## Matching`,
    `- symbols to place on the new copy: ${toMatch.length} (${witnessed.length} in force at ${WITNESSED_VERSION}, ${carriedByOld.length} carried by the old copy)`,
    ...passes.map((_, i) => {
        const found = matches.filter(m => m.pass === matches.find(x => x.pass === [...new Set(matches.map(y => y.pass))][i])?.pass)
        return found
    }).flatMap((_, i) => {
        const pass = [...new Set(matches.map(m => m.pass))][i]
        const found = matches.filter(m => m.pass === pass)
        return pass ? [`- matched ${pass}: ${found.length}`, ...(i > 0 ? found.map(m => `  - ${describeSymbol(m.symbol)} -> ${describeHole(m.hole)}, ${m.distance.toFixed(1)} mm off`) : [])] : []
    }),
    `- carriers replaced: ${matches.length - carriersAdded.length}, added: ${carriersAdded.length}, dropped: ${carriersDropped.length}`,
    ...carriersAdded.map(s => `  - added: ${describeSymbol(s)}`),
    ``,
    `## Symbols without a hole on the new scan (${unmatchedSymbols.length})`,
    ...unmatchedSymbols.map(s => `- ${describeSymbol(s)}${witnessedIds.has(s['@id']) ? '' : ` [not in force at ${WITNESSED_VERSION}]`}`),
    ``,
    `## Withdrawn from the tree, having no carrier left (${withdrawn.length})`,
    ...withdrawn.map(s => `- ${describeSymbol(s)}`),
    ...(editsTrimmed.length ? [`- edits that inserted or deleted them, trimmed:`, ...editsTrimmed.map(e => `  - ${e}`)] : []),
    ...(editsEmptied.length ? [`- edits removed because nothing else was left in them:`, ...editsEmptied.map(e => `  - ${e}`)] : []),
    ``,
    `## Holes on the new scan without a symbol (${unmatchedHoles.length})`,
    ...unmatchedHoles.map(h => `- ${describeHole(h)}`),
    ``,
    `## Checks`,
    `- old feature ids still referenced: ${dangling.length}`,
    `- carriers pointing nowhere: ${unresolved.length}`,
    `- deletions of withdrawn symbols left behind: ${deletesOfWithdrawn.length}`,
    `- deletions of symbols that do not exist: ${danglingAfter.length} (${danglingBefore.length} before, untouched)`,
    `- schema: ${valid ? 'valid' : JSON.stringify(validate.errors?.slice(0, 5))}`,
].join('\n')

console.log(report)

if (flag === '--write') {
    if (dangling.length || unresolved.length || deletesOfWithdrawn.length || danglingAfter.length !== danglingBefore.length || !valid) {
        console.error('refusing to write: the checks failed')
        process.exit(1)
    }
    writeFileSync(ROLL_JSON, output)
    writeFileSync(REPORT, report + '\n')
    console.log(`\nwrote ${ROLL_JSON.pathname} and ${REPORT.pathname}`)
}
