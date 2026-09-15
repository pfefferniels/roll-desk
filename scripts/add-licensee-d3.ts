/**
 * Adds the Licensee version D3 of WM 225, read on Peter Phillips's copy,
 * together with the lost state B2 that D3 shares with C.
 *
 * Phillips's e-roll carries seven additions of C at the place C has them,
 * an eighth close by, and none of C's other additions, so C and D3 share a
 * model after B that no copy witnesses: B2 takes those eight edits. The same
 * reading carries Stanford-1's crescendo before the upbeat, which therefore
 * belongs to B, and C moves it behind the upbeat. D3 is whatever the
 * reading shows against B2. Gourlin's copy, known from Trachtman's
 * emulation, is stated to carry D3.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/add-licensee-d3.ts <e-roll.mid> [--archive=<commit>] [--write]
 *
 * The beliefs about Gourlin's copy cite the analysis archived in the
 * welte225.org repository, so writing needs the commit that holds it.
 */

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { keyOf, mm, readFromPhillipsEroll, track, welteLicensee } from 'linked-rolls'
import type { Millimeters, Seconds } from 'linked-rolls'
import {
    adopted, argued, believing, changedTexts, dated, decimal, editsOf, finish, inferred, insertionsIn, inWords, Json,
    person, readEdition, structuralProblems, symbolsShownBy, textOf, textsOf, versionBy
} from './storedEdition'

const args = process.argv.slice(2)
const EROLL = args.find(arg => arg.endsWith('.mid'))
const ARCHIVE = args.find(arg => arg.startsWith('--archive='))?.slice('--archive='.length)
if (!EROLL) throw new Error('usage: add-licensee-d3.ts <e-roll.mid> [--archive=<commit>] [--write]')
if (args.includes('--write') && !ARCHIVE) throw new Error('--write needs --archive=<commit> of welte225.org')

const TOLERANCE = 8
const TOLERANCE_OBJECT = { toleranceStart: TOLERANCE, toleranceEnd: TOLERANCE }
/** Within this distance 95 % of the reading's archetypal punches lie from their place on the red copies. */
const SAME_PLACE = 3.3
/** The largest move of a punch the reading shows where the move is not in doubt. */
const SHIFT_REACH = 25
/** The widest crescendo or forzando taken as one pair of commands. */
const PAIR_REACH = 60
const CHASE = '6e1ce072-7490-44b6-b8e8-eb1bbffc3cad'
const T100_COPIES = new Set([
    'd229954b-086c-44d6-a589-aaa324d31d88',
    '88460599-2e0d-4759-851c-903a5a521997',
    'a7ff95b7-f43a-4341-ba86-80fa4e84499c'
])
const SHARED_WITH_C = [
    '7f8e297b-44c4-444d-88c0-21e5305ca914',
    'fb939f6f-8c7d-445c-b4a9-9ecf485ac1b9',
    '2ab33014-d2ce-4c40-b3df-7213993d55a3',
    'ea208aa8-c323-44d6-8667-9f47aa66a9ef',
    'b6bcfb71-633d-4066-9354-83cb4959c541',
    '30c02b21-f748-4910-ab89-f476f10e57e3',
    '5c83e6a7-8aa4-4816-8a28-d084b1e9bdc9',
    '44889eb1-b985-4611-8035-125cac2e5e25'
]
const LEADER_OF_B1 = ['583873b8-f331-4687-acbe-450694e239ac', 'f7a1f802-45da-45ff-ac12-cdece63084a0']
const LEADER_OF_C = ['f776d5f7-d04e-440c-813e-95e0086fb2e4', '928846de-62bc-4e4a-9b34-1ecad34c5a74']
const TRACHTMAN_FILE = 'https://www.pianorollmusic.org/html/trachtman/midifiles/NonPDfiles/WelteMignon-C-225_Traumerei(Schumann)_eRollMIDI_Wexp.mid'
const archived = (path: string) => `https://github.com/pfefferniels/welte225.org/blob/${ARCHIVE ?? 'COMMIT'}/licensee-225/${path}`

const document = readEdition()
if (document.versions.some((v: Json) => v.siglum === 'B2')) {
    console.log('  B2 steht schon in der Edition, nichts zu tun')
    process.exit(0)
}
const textsBefore = textsOf(document)

// ------------------------------------------------------------ small algorithms

/** The element at the index, where an index out of range is the caller's mistake. */
const at = <T>(values: ArrayLike<T>, k: number): T => {
    const value = values[k]
    if (value === undefined) throw new RangeError(`index ${k} out of range`)
    return value
}

const median = (values: readonly number[]): number => {
    const sorted = [...values].sort((a, b) => a - b)
    return (at(sorted, sorted.length >> 1) + at(sorted, (sorted.length - 1) >> 1)) / 2
}

const quantile = (values: readonly number[], share: number): number => {
    const sorted = [...values].sort((a, b) => a - b)
    return at(sorted, Math.min(sorted.length - 1, Math.floor(share * sorted.length)))
}

const runningMedian = (values: readonly number[], half: number): number[] =>
    values.map((_, k) => median(values.slice(Math.max(0, k - half), k + half + 1)))

interface Point { x: number, y: number }

/** Piecewise linear through points sorted by x, held flat beyond the first and the last. */
const interpolate = (points: readonly Point[]) => (x: number): number => {
    const before = points.reduce<Point | undefined>((found, point) => (point.x <= x ? point : found), undefined)
    const after = points.find(point => point.x > x)
    if (before && after) return before.y + (x - before.x) / (after.x - before.x) * (after.y - before.y)
    const held = before ?? after
    if (!held) throw new RangeError('nothing to interpolate')
    return held.y
}

/** Least squares parabola, centred on the mean argument to keep the normal equations well conditioned. */
const fitParabola = (points: readonly Point[]) => {
    const sum = (f: (point: Point) => number) => points.reduce((total, point) => total + f(point), 0)
    const centre = sum(point => point.x) / points.length
    const u = (point: Point) => point.x - centre
    const [s0, s1, s2, s3, s4] = [points.length, sum(u), sum(p => u(p) ** 2), sum(p => u(p) ** 3), sum(p => u(p) ** 4)] as const
    const [t0, t1, t2] = [sum(p => p.y), sum(p => u(p) * p.y), sum(p => u(p) ** 2 * p.y)] as const
    const det = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) =>
        a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    const whole = det(s4, s3, s2, s3, s2, s1, s2, s1, s0)
    const a = det(t2, s3, s2, t1, s2, s1, t0, s1, s0) / whole
    const b = det(s4, t2, s2, s3, t1, s1, s2, t0, s0) / whole
    const c = det(s4, s3, t2, s3, s2, t1, s2, s1, t0) / whole
    return (x: number) => a * (x - centre) ** 2 + b * (x - centre) + c
}

/** Needleman–Wunsch: the index pairs of two sequences that the best global alignment matches. */
const alignSequences = <A, B>(a: readonly A[], b: readonly B[], matches: (x: A, y: B) => boolean): [number, number][] => {
    const [HIT, MISS, GAP] = [3, -2, -1] as const
    const [DIAGONAL, UP, LEFT] = [0, 1, 2] as const
    const width = b.length + 1
    const cells = (a.length + 1) * width
    const score = Array.from({ length: cells }, (_, k) => (k < width ? GAP * k : k % width === 0 ? GAP * (k / width) : 0))
    const step = Array.from({ length: cells }, (_, k) => (k < width ? LEFT : k % width === 0 ? UP : DIAGONAL))
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const diagonal = at(score, (i - 1) * width + j - 1) + (matches(at(a, i - 1), at(b, j - 1)) ? HIT : MISS)
            const up = at(score, (i - 1) * width + j) + GAP
            const left = at(score, i * width + j - 1) + GAP
            const best = Math.max(diagonal, up, left)
            score[i * width + j] = best
            step[i * width + j] = best === diagonal ? DIAGONAL : best === up ? UP : LEFT
        }
    }
    const pairs: [number, number][] = []
    let i = a.length, j = b.length
    while (i > 0 || j > 0) {
        const move = at(step, i * width + j)
        if (move === DIAGONAL) {
            if (matches(at(a, i - 1), at(b, j - 1))) pairs.push([i - 1, j - 1])
            i--; j--
        } else if (move === UP) i--
        else j--
    }
    return pairs.reverse()
}

/** Onset order, with the notes of one chord sorted by pitch, so that a spread chord cannot reorder the sequence. */
const chordOrder = <T extends { pitch: number }>(items: readonly T[], place: (item: T) => number, gap = 6): T[] =>
    [...items]
        .sort((x, y) => place(x) - place(y))
        .reduce<T[][]>((chords, item) => {
            const chord = chords[chords.length - 1]
            const last = chord ? chord[chord.length - 1] : undefined
            if (chord && last && place(item) - place(last) <= gap) chord.push(item)
            else chords.push([item])
            return chords
        }, [])
        .flatMap(chord => chord.sort((x, y) => x.pitch - y.pitch))

// ------------------------------------------------------------- the reading

interface Span { from: number, to: number }

const copyOfFeature = new Map<string, string>(document.copies.flatMap((copy: Json) =>
    (copy.features ?? []).map((feature: Json) => [feature['@id'], copy['@id']])))
const featureById = new Map<string, Json>(document.copies.flatMap((copy: Json) =>
    (copy.features ?? []).map((feature: Json) => [feature['@id'], feature])))

/** Where the symbol lies, as the mean of its carriers, or of those on the given copies. */
const spanOf = (symbol: Json, copies?: ReadonlySet<string>): Span | undefined => {
    const carried: Json[] = (symbol.carriers ?? [])
        .map((carrier: Json) => carrier['@id'])
        .filter((id: string) => !copies || copies.has(copyOfFeature.get(id) ?? ''))
        .flatMap((id: string) => featureById.get(id) ?? [])
    if (carried.length === 0) return undefined
    return {
        from: carried.reduce((sum, f) => sum + f.horizontal.from, 0) / carried.length,
        to: carried.reduce((sum, f) => sum + f.horizontal.to, 0) / carried.length
    }
}

const readingOfSymbol = (symbol: Json): string =>
    keyOf(symbol['@type'] === 'note'
        ? { type: 'note', pitch: symbol.pitch }
        : { type: 'expression', expressionType: symbol.expressionType, scope: symbol.scope })

const meaningOfFeature = (feature: Json) => {
    const meaning = welteLicensee.meaningOf(track(feature.vertical.from))
    if (!meaning) throw new Error(`the Licensee bar reads nothing at track ${feature.vertical.from}`)
    return meaning
}
const readingOfFeature = (feature: Json): string => keyOf(meaningOfFeature(feature))

const erollBuffer = readFileSync(EROLL)
const readAt = (placeAt: (elapsed: Seconds) => Millimeters) =>
    readFromPhillipsEroll(
        erollBuffer.buffer.slice(erollBuffer.byteOffset, erollBuffer.byteOffset + erollBuffer.byteLength),
        { system: welteLicensee, placeAt })

/**
 * Puts the reading's elapsed time onto the edition's axis through its notes.
 * The notes of the reading and of C are aligned as sequences of pitches, a
 * parabola through the pairs takes up the take-up spool, and a running
 * median over thirteen notes the local stretches of the re-cut paper.
 */
const placementOnEdition = () => {
    const inSeconds = readAt(elapsed => mm(elapsed))
    const reading = inSeconds.features.flatMap(feature => {
        const meaning = welteLicensee.meaningOf(feature.vertical.from)
        return meaning?.type === 'note' ? [{ at: Number(feature.horizontal.from), pitch: meaning.pitch }] : []
    })
    const reference = symbolsShownBy(document, versionBy(document, 'C'))
        .filter(symbol => symbol['@type'] === 'note')
        .flatMap(symbol => {
            const span = spanOf(symbol)
            return span ? [{ at: span.from, pitch: symbol.pitch as number }] : []
        })

    const times = reading.map(onset => onset.at)
    const places = reference.map(onset => onset.at)
    const [firstT, lastT, firstX, lastX] = [Math.min(...times), Math.max(...times), Math.min(...places), Math.max(...places)]
    const line = (t: number) => firstX + (t - firstT) * (lastX - firstX) / (lastT - firstT)

    const pairsUnder = (guess: (t: number) => number, window: number): Point[] => {
        const a = chordOrder(reading.map(onset => ({ ...onset, guess: guess(onset.at) })), onset => onset.guess)
        const b = chordOrder(reference, onset => onset.at)
        return alignSequences(a, b, (x, y) => x.pitch === y.pitch && Math.abs(x.guess - y.at) < window)
            .map(([i, j]) => ({ x: at(a, i).at, y: at(b, j).at }))
    }
    const parabola = fitParabola(pairsUnder(line, 150))
    const pairs = pairsUnder(parabola, 60).sort((p, q) => p.x - q.x)
    const smooth = runningMedian(pairs.map(p => p.y - parabola(p.x)), 6)
    const correction = interpolate(pairs.map((p, k) => ({ x: p.x, y: at(smooth, k) })))
    const placeAt = (elapsed: number) => parabola(elapsed) + correction(elapsed)
    const deviations = pairs.map((p, k) => Math.abs(p.y - parabola(p.x) - at(smooth, k)))
    return {
        placeAt: (elapsed: Seconds) => mm(placeAt(elapsed)),
        covered: { from: placeAt(0), to: placeAt(Math.max(...inSeconds.features.map(f => Number(f.horizontal.to)))) },
        aligned: pairs.length,
        notes: reading.length,
        deviation: { p50: median(deviations), p95: quantile(deviations, 0.95) }
    }
}

const placement = placementOnEdition()
const reading = readAt(placement.placeAt)
const asStored = ({ type, id, ...rest }: { type: string, id: string }) => ({ '@type': type, '@id': id, ...rest })

const chase = document.copies.find((copy: Json) => copy['@id'] === CHASE)
if (!chase) throw new Error('no Chase copy to take the Licensee system and its earliest date from')
const notBefore1916 = () => dated(chase.production.date['@value'], believing('true', chase.production.date['@annotation'].belief.reasons))

const phillips: Json = {
    '@type': 'RollCopy',
    '@id': reading.id,
    ops: [],
    conditions: [],
    measurements: {},
    modifications: [],
    keeper: person('Peter Phillips'),
    production: { system: chase.production.system, date: notBefore1916() },
    features: reading.features.map(asStored)
}
document.copies.push(phillips)
phillips.features.forEach((feature: Json) => {
    featureById.set(feature['@id'], feature)
    copyOfFeature.set(feature['@id'], phillips['@id'])
})

// ------------------------------------------------------- the tree: B2, leader

const takeEdits = (version: Json, ids: readonly string[]): Json[] => {
    const taken = editsOf(version).filter(edit => ids.includes(edit['@id']))
    if (taken.length !== ids.length) throw new Error(`${version.siglum} lacks some of ${ids.join(', ')}`)
    version.edits = editsOf(version).filter(edit => !ids.includes(edit['@id']))
    return taken
}

const b = versionBy(document, 'B')
const b1 = versionBy(document, 'B1')
const c = versionBy(document, 'C')
const d1 = versionBy(document, 'D1')

const b2: Json = {
    '@context': c['@context'],
    '@type': 'Version',
    '@id': randomUUID(),
    siglum: 'B2',
    system: c.system,
    basedOn: [{ '@id': b['@id'], collationTolerance: TOLERANCE_OBJECT }],
    motivations: [],
    edits: takeEdits(c, SHARED_WITH_C)
}
c.basedOn = [{ ...at<Json>(c.basedOn, 0), '@id': b2['@id'] }]
document.versions.splice(document.versions.indexOf(b) + 1, 0, b2)

const leaderPair = takeEdits(b1, LEADER_OF_B1).flatMap(edit => edit.insert)
const leaderOfC = takeEdits(c, LEADER_OF_C)
b.edits = [...editsOf(b), {
    '@type': 'edit', '@id': randomUUID(), editType: 'additional-accent', motivation: 'anacrusis-accent', insert: leaderPair
}]
c.edits = [...editsOf(c), {
    '@type': 'edit', '@id': randomUUID(), editType: 'shift', motivation: 'swell-behind-upbeat',
    insert: leaderOfC.flatMap(edit => edit.insert),
    delete: leaderPair.map(symbol => symbol['@id'])
}]
c.motivations = [...(c.motivations ?? []), {
    '@type': 'motivation', '@id': 'swell-behind-upbeat',
    note: 'Das Crescendo vor dem Auftakt rückt hinter ihn, der Auftakt erhält ein Forzando'
}]
at<Json>(b1.basedOn, 0)['@annotation'] = believing('possible', [argued(
    'Die Lesart trägt allein Stanford-1: ein Crescendo an bei 7364,7 mm, das in B redundant wäre. Es kann eine '
    + 'Stanzung dieses Exemplars sein oder eine Redundanz von B, die C und D3 unabhängig voneinander tilgten, was bei '
    + 'Redundanzen zu erwarten ist. Das Crescendo-Paar vor dem Auftakt, das früher ebenfalls hier stand, trägt auch '
    + 'die Licensee-Fassung D3 an derselben Stelle. Es gehört daher zu B, und C verlegt es.')])

// ------------------------------------------------------ D3 against B2

interface Pairing { symbol: Json, span: Span, feature: Json, start: number, end: number }

const pairingsOf = (symbols: readonly Json[], features: readonly Json[], accept: (p: Pairing) => boolean): Pairing[] =>
    symbols.flatMap(symbol => {
        const span = spanOf(symbol)
        return span
            ? features
                .filter(feature => readingOfFeature(feature) === readingOfSymbol(symbol))
                .map(feature => ({
                    symbol, span, feature,
                    start: feature.horizontal.from - span.from,
                    end: feature.horizontal.to - span.to
                }))
                .filter(accept)
            : []
    })

/** Each symbol and each feature in at most one pairing, the closest first. */
const oneToOne = (pairings: readonly Pairing[], weight: (p: Pairing) => number): Pairing[] => {
    const usedSymbols = new Set<string>()
    const usedFeatures = new Set<string>()
    return [...pairings].sort((p, q) => weight(p) - weight(q)).filter(p => {
        if (usedSymbols.has(p.symbol['@id']) || usedFeatures.has(p.feature['@id'])) return false
        usedSymbols.add(p.symbol['@id'])
        usedFeatures.add(p.feature['@id'])
        return true
    })
}

const b2Text = symbolsShownBy(document, b2)
const inCoverage = (place: number) => place >= placement.covered.from && place <= placement.covered.to
const inherited = b2Text.filter(symbol => inCoverage(spanOf(symbol)?.from ?? -Infinity))
const phillipsFeatures: Json[] = phillips.features

const collated = oneToOne(
    pairingsOf(inherited, phillipsFeatures, p => Math.abs(p.start) <= TOLERANCE && Math.abs(p.end) <= TOLERANCE),
    p => Math.abs(p.start) + Math.abs(p.end))
const collatedSymbols = new Set(collated.map(p => p.symbol['@id']))
const collatedFeatures = new Set(collated.map(p => p.feature['@id']))
const missing = inherited.filter(symbol => !collatedSymbols.has(symbol['@id']))
const own = phillipsFeatures.filter(feature => !collatedFeatures.has(feature['@id']))
const moved = oneToOne(pairingsOf(missing, own, p => Math.abs(p.start) <= SHIFT_REACH), p => Math.abs(p.start))

const expressionStarts = collated.filter(p => p.symbol['@type'] === 'expression')
const expressionOffset = median(expressionStarts.map(p => p.start))
const precision = expressionStarts.map(p => Math.abs(p.start - expressionOffset))
const localOffset = (place: number) => {
    const near = expressionStarts.filter(p => Math.abs(p.span.from - place) <= 150).map(p => p.start)
    return near.length >= 5 ? median(near) : expressionOffset
}

/** How far the nearest punch of the symbol's kind lies from its place on the red copies, less the local offset. */
const nearestOnReading = (symbol: Json, features: readonly Json[] = phillipsFeatures): number => {
    const span = spanOf(symbol, T100_COPIES)
    if (!span) return Infinity
    return features
        .filter(feature => readingOfFeature(feature) === readingOfSymbol(symbol))
        .map(feature => feature.horizontal.from - localOffset(span.from) - span.from)
        .reduce((best, d) => (Math.abs(d) < Math.abs(best) ? d : best), Infinity)
}

// Where B moved or struck a punch of A, the reading may still show A's punch rather than B's.
const editsOfB = editsOf(b)
const struckByB = (symbol: Json) => editsOfB.filter(edit => (edit.delete ?? []).includes(symbol['@id']))
const changedByB = insertionsIn(versionBy(document, 'A'))
    .filter(symbol => symbol['@type'] === 'expression' && struckByB(symbol).length > 0)
const keptFromA = changedByB.filter(symbol => Math.abs(nearestOnReading(symbol, own)) <= SAME_PLACE)
const followsB = changedByB.filter(symbol => struckByB(symbol).some(edit => (edit.insert ?? [])
    .some((other: Json) => readingOfSymbol(other) === readingOfSymbol(symbol) && collatedSymbols.has(other['@id']))))

// A command's lane is the function and register it switches; within a lane a command is redundant
// where it sets the state the lane is already in.
const LANES = ['SlowCrescendo', 'Forzando', 'SoftPedal', 'SustainPedal', 'Mezzoforte']
interface Command { id: string, at: number, lane: string, on: boolean }
interface Placed { symbol: Json, at: number }

const commandOf = ({ symbol, at: place }: Placed): Command | undefined => {
    if (symbol['@type'] !== 'expression') return undefined
    const lane = LANES.find(name => symbol.expressionType === `${name}On` || symbol.expressionType === `${name}Off`)
    return lane === undefined ? undefined : { id: symbol['@id'], at: place, lane: `${lane} ${symbol.scope}`, on: symbol.expressionType.endsWith('On') }
}

const commandsIn = (text: readonly Placed[]): Command[] =>
    text.flatMap(placed => commandOf(placed) ?? []).sort((x, y) => x.at - y.at)

const redundantIn = (commands: readonly Command[]): Set<string> => {
    const lanes = [...new Set(commands.map(command => command.lane))]
    return new Set(lanes.flatMap(lane => commands
        .filter(command => command.lane === lane)
        .reduce<{ state: boolean, redundant: string[] }>(({ state, redundant }, command) =>
            (command.on === state ? { state, redundant: [...redundant, command.id] } : { state: command.on, redundant }),
        { state: false, redundant: [] })
        .redundant))
}

const newSymbolOf = new Map<string, Json>(own.map(feature => {
    const meaning = meaningOfFeature(feature)
    const carriers = [{ '@id': feature['@id'] }]
    const id = `symbol_${randomUUID()}`
    return [feature['@id'], meaning.type === 'note'
        ? { '@type': 'note', '@id': id, pitch: meaning.pitch, carriers }
        : { '@type': 'expression', '@id': id, expressionType: meaning.expressionType, scope: meaning.scope, carriers }]
}))
const newSymbol = (feature: Json): Json => {
    const symbol = newSymbolOf.get(feature['@id'])
    if (!symbol) throw new Error(`no symbol for feature ${feature['@id']}`)
    return symbol
}

// The groups of changes each D3 edit is made of, taken in an order that lets the specific patterns claim their items first.

interface Group { pattern: string, removes: Json[], adds: Json[], pairing?: Pairing }

const firstNoteAt = Math.min(...phillipsFeatures.filter(f => meaningOfFeature(f).type === 'note').map(f => f.horizontal.from))
const lastNoteEnd = Math.max(...phillipsFeatures.filter(f => meaningOfFeature(f).type === 'note').map(f => f.horizontal.to))
const isNote = (symbol: Json) => symbol['@type'] === 'note'
const movedNotes = moved.filter(p => isNote(p.symbol))

const claimedSymbols = new Set<string>()
const claimedFeatures = new Set<string>()
const claim = (group: Group): Group => {
    group.removes.forEach(symbol => claimedSymbols.add(symbol['@id']))
    group.adds.forEach(feature => claimedFeatures.add(feature['@id']))
    return group
}
const unclaimedMissing = () => missing.filter(symbol => !claimedSymbols.has(symbol['@id']))
const unclaimedOwn = () => own.filter(feature => !claimedFeatures.has(feature['@id']))

const cancelRow = claim({ pattern: 'cancel-row', removes: [], adds: own.filter(f => f.horizontal.to < firstNoteAt) })
const unaCorda = claim({ pattern: 'una-corda', removes: missing.filter(s => s.expressionType?.startsWith('SoftPedal')), adds: [] })

const ties = movedNotes.flatMap(p => {
    const covered = unclaimedMissing().filter(s => isNote(s) && s.pitch === p.symbol.pitch
        && s['@id'] !== p.symbol['@id'] && (spanOf(s)?.from ?? 0) > p.span.from && (spanOf(s)?.from ?? Infinity) < p.feature.horizontal.to)
    return covered.length > 0 ? [claim({ pattern: 'tie', removes: [p.symbol, ...covered], adds: [p.feature], pairing: p })] : []
})

const restrikes = movedNotes.filter(p => !claimedSymbols.has(p.symbol['@id'])).flatMap(p => {
    const again = unclaimedOwn().find(f => meaningOfFeature(f).type === 'note' && readingOfFeature(f) === readingOfSymbol(p.symbol)
        && f.horizontal.from >= p.feature.horizontal.to && f.horizontal.from - p.feature.horizontal.to <= 20)
    return again ? [claim({ pattern: 'restrike', removes: [p.symbol], adds: [p.feature, again], pairing: p })] : []
})

const shifts = moved
    .filter(p => !claimedSymbols.has(p.symbol['@id']) && !claimedFeatures.has(p.feature['@id']))
    .map(p => claim({ pattern: 'moved', removes: [p.symbol], adds: [p.feature], pairing: p }))

/** Consecutive On and Off of one lane within reach go together, everything else alone. */
const inPairs = <T>(items: readonly T[], placed: (item: T) => Placed): T[][] =>
    [...items]
        .sort((x, y) => placed(x).at - placed(y).at)
        .reduce<T[][]>((groups, item) => {
            const group = groups[groups.length - 1]
            const head = group && group.length === 1 ? group[0] : undefined
            const [first, second] = [head && commandOf(placed(head)), commandOf(placed(item))]
            if (group && first && second && first.on && !second.on && first.lane === second.lane && second.at - first.at <= PAIR_REACH) group.push(item)
            else groups.push([item])
            return groups
        }, [])

const placedSymbol = (symbol: Json): Placed => ({ symbol, at: spanOf(symbol)?.from ?? 0 })
const placedFeature = (feature: Json): Placed => ({ symbol: newSymbol(feature), at: feature.horizontal.from })

const withdrawals = inPairs(unclaimedMissing(), placedSymbol).map(removes => claim({ pattern: 'struck', removes, adds: [] }))
const additions = inPairs(unclaimedOwn(), placedFeature).map(adds => claim({ pattern: 'added', removes: [], adds }))

const groups = [cancelRow, unaCorda, ...ties, ...restrikes, ...shifts, ...withdrawals, ...additions]
    .filter(group => group.removes.length + group.adds.length > 0)
    .sort((x, y) => Math.min(...x.removes.map(s => placedSymbol(s).at), ...x.adds.map(f => f.horizontal.from))
        - Math.min(...y.removes.map(s => placedSymbol(s).at), ...y.adds.map(f => f.horizontal.from)))

const removedIds = new Set(groups.flatMap(group => group.removes.map(symbol => symbol['@id'])))
const b2Placed = b2Text.map(placedSymbol)
const d3Placed = [...b2Placed.filter(p => !removedIds.has(p.symbol['@id'])), ...own.map(placedFeature)]
const redundantInB2 = redundantIn(commandsIn(b2Placed))
const redundantInD3 = redundantIn(commandsIn(d3Placed))
const d3Commands = commandsIn(d3Placed)
const nextInLane = (command: Command) => d3Commands.find(other => other.lane === command.lane && other.at > command.at)
const noteOnsets = d3Placed.filter(p => isNote(p.symbol)).map(p => p.at).sort((x, y) => x - y)

const MOTIVATIONS: Record<string, string> = {
    'cancel-row': 'Löschreihe vor dem ersten Ton, die Pedale, Pianozug und alle Ausdrucksfunktionen zurücksetzt',
    'una-corda-dropped': 'Die Verschiebung durch den Pianozug entfällt im Stück',
    'repetition-tied': 'Die Wiederholung des Tons entfällt, er klingt durch',
    'note-restruck': 'Der Ton wird abgesetzt und neu angeschlagen',
    'held-note-shortened': 'Der gehaltene Ton endet kurz nach dem nächsten Anschlag',
    'accent-withdrawn': 'Die Betonung entfällt mit ihrer An-Stanzung, die Ab-Stanzung bleibt wirkungslos stehen',
    'cleanup-d3': 'Bereinigung',
    'following-command-made-effective': 'Die Stanzung macht den folgenden Befehl derselben Funktion wirksam, der sonst redundant bliebe',
    'closing-release': 'Ab-Stanzung nach dem letzten Ton'
}

interface Reading { editType?: string, motivation?: string, belief?: Json }

const soleCommand = (group: Group, placed: Placed[]) => (placed.length === 1 ? commandOf(at(placed, 0)) : undefined)

const readingOfGroup = (group: Group): Reading => {
    const pairing = group.pairing
    if (group.pattern === 'cancel-row') return { motivation: 'cancel-row' }
    if (group.pattern === 'una-corda') return {
        motivation: 'una-corda-dropped',
        belief: believing('likely', [argued(
            'Die Lesung zeigt keine der Ab-Stanzungen des Pianozugs, obwohl der Schalter von Spur 7 in der Löschreihe '
            + 'und nach dem letzten Ton anspricht. Das An auf Spur 8 kommt in der ganzen Datei nicht vor. Ob Phillips\' '
            + 'Leser diese Spur liest, ist nicht bekannt, daher bleibt das Entfallen der An-Stanzungen offen. Die '
            + 'Anschlagstärken in Trachtmans Emulation von Gourlins Exemplar zeigen in T. 8′ bis 15 keine Änderung durch '
            + 'den Pianozug.')])
    }
    if (group.pattern === 'tie' && pairing) return { editType: 'prolong', motivation: 'repetition-tied' }
    if (group.pattern === 'restrike' && pairing) return { editType: 'shorten', motivation: 'note-restruck' }
    if (group.pattern === 'moved' && pairing) {
        if (Math.abs(pairing.start) > TOLERANCE) return { editType: 'shift' }
        if (!isNote(pairing.symbol)) return { editType: 'shift' }
        if (pairing.end > 0) return { editType: 'prolong' }
        const next = noteOnsets.find(onset => onset > pairing.span.from + 2)
        const endsJustAfter = next !== undefined && pairing.feature.horizontal.to - next >= -1 && pairing.feature.horizontal.to - next <= 8
        return endsJustAfter ? { editType: 'shorten', motivation: 'held-note-shortened' } : { editType: 'shorten' }
    }
    if (group.pattern === 'struck') {
        const command = soleCommand(group, group.removes.map(placedSymbol))
        if (command && redundantInB2.has(command.id)) return { editType: 'remove-redundancy', motivation: 'cleanup-d3' }
        const next = command && nextInLane(command)
        if (command?.on && next && !next.on && redundantInD3.has(next.id)) return { motivation: 'accent-withdrawn' }
        return {}
    }
    if (group.pattern === 'added') {
        const placed = group.adds.map(placedFeature)
        const commands = placed.map(commandOf)
        const [first, second] = commands
        if (commands.length === 2 && first && second && first.lane === second.lane && !first.lane.startsWith('SustainPedal')) {
            return { editType: 'additional-accent' }
        }
        const command = soleCommand(group, placed)
        if (command && redundantInD3.has(command.id)) {
            return command.at > lastNoteEnd ? { editType: 'add-redundancy', motivation: 'closing-release' } : { editType: 'add-redundancy' }
        }
        const next = command && nextInLane(command)
        if (next && redundantInB2.has(next.id) && !redundantInD3.has(next.id)) {
            return { motivation: 'following-command-made-effective' }
        }
        return {}
    }
    return {}
}

const retainedIn = (group: Group): Json[] => keptFromA.filter(symbol => {
    const span = spanOf(symbol, T100_COPIES)
    return span !== undefined && group.adds.some(feature => readingOfFeature(feature) === readingOfSymbol(symbol)
        && Math.abs(feature.horizontal.from - localOffset(span.from) - span.from) <= SAME_PLACE)
})

const retentionBelief = (group: Group, kept: readonly Json[]): Json => believing('likely', [inferred(
    `${group.adds.length > 1 ? 'Eine Stanzung dieser Bearbeitung' : 'Die Stanzung'} liegt, wo A sie hat `
    + `(${kept.map(symbol => `${decimal(spanOf(symbol, T100_COPIES)?.from ?? 0)} mm`).join(', ')}), überliefert allein im `
    + 'Exemplar Widuch, und wo B sie verschoben oder getilgt hat. '
    + `An ${inWords(keptFromA.length)} der ${changedByB.length} Stellen, an denen B so eine Stanzung von A ändert, trägt diese `
    + 'Lesung die von A, an den meisten übrigen die von B. Zufällig gelegte eigene Stanzungen der Lesung treffen solche Stellen '
    + 'im Mittel 0,7-mal und in 1000 Versuchen bis zu siebenmal. Die Bearbeitung kann daher eine eigene von D3 sein, die die '
    + 'Stelle von A wieder trifft. Sie kann auch bedeuten, dass D3 hier bewahrt, was B änderte, was sich mit der Ableitung über '
    + 'B2 nur unter der Annahme einer Vermischung vertrüge.',
    [archived('eroll/retentions.py'), archived('eroll/retentions.txt')])])

const d3Edits = groups.map(group => {
    const stated = readingOfGroup(group)
    const kept = retainedIn(group)
    const { editType, motivation } = stated
    const belief = stated.belief ?? (kept.length > 0 ? retentionBelief(group, kept) : undefined)
    return {
        '@type': 'edit',
        '@id': randomUUID(),
        ...(editType ? { editType } : {}),
        ...(motivation ? { motivation } : {}),
        ...(group.adds.length > 0 ? { insert: group.adds.map(newSymbol) } : {}),
        ...(group.removes.length > 0 ? { delete: group.removes.map(symbol => symbol['@id']) } : {}),
        ...(belief ? { '@annotation': belief } : {})
    }
})

collated.forEach(p => { p.symbol.carriers = [...(p.symbol.carriers ?? []), { '@id': p.feature['@id'] }] })

// ----------------------------------------------------------- counts for the notes

const bAdditions = insertionsIn(b).filter(symbol => symbol['@type'] === 'expression'
    && b2Text.includes(symbol) && inCoverage(spanOf(symbol, T100_COPIES)?.from ?? -Infinity))
const bPresent = bAdditions.filter(symbol => collatedSymbols.has(symbol['@id']))
const cAdditions = insertionsIn(c).filter(symbol => symbol['@type'] === 'expression')
const mittelstimmen = editsOf(c).filter(edit => (c.motivations ?? []).some((m: Json) => m['@id'] === edit.motivation && m.note === 'Differenzierung der Mittelstimmen'))

const sharedCheck = editsOf(b2).map(edit => {
    const distances: number[] = edit.insert.map((symbol: Json) => nearestOnReading(symbol))
    return {
        edit,
        distances,
        binds: distances.some(d => Math.abs(d) <= SAME_PLACE),
        complete: distances.every(d => Math.abs(d) <= SAME_PLACE)
    }
})
const binding = sharedCheck.filter(check => check.binds)
const complete = sharedCheck.filter(check => check.complete)
const nearOnly = sharedCheck.filter(check => !check.binds)

const LANE_NAMES: Record<string, string> = { SlowCrescendo: 'Crescendo', Forzando: 'Forzando' }
const PLURALS: Record<string, string> = { Crescendo: 'Crescendi', Forzando: 'Forzandi' }
const laneNameOf = (symbol: Json): string => {
    const lane = Object.keys(LANE_NAMES).find(name => symbol.expressionType.startsWith(name))
    return (lane && LANE_NAMES[lane]) ?? symbol.expressionType
}
const registerOf = (symbol: Json) => (symbol.scope === 'bass' ? 'Bass' : 'Diskant')
const roundedPlace = (symbol: Json) => Math.round(spanOf(symbol, T100_COPIES)?.from ?? 0)
const describeAddition = (edit: Json): string => {
    const symbol = at<Json>(edit.insert, 0)
    return `das ${laneNameOf(symbol)} im ${registerOf(symbol)} bei ${roundedPlace(symbol)} mm`
}
const listed = (items: readonly string[]): string =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} und ${at(items, items.length - 1)}`
const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
/** The additions named together by kind and register, each kind with its places in order. */
const describeAdditions = (checks: readonly { edit: Json }[]): string => {
    const kinds = checks
        .map(check => at<Json>(check.edit.insert, 0))
        .sort((x, y) => roundedPlace(x) - roundedPlace(y))
        .reduce<Map<string, number[]>>((groups, symbol) => {
            const key = `${laneNameOf(symbol)}|${registerOf(symbol)}`
            return groups.set(key, [...(groups.get(key) ?? []), roundedPlace(symbol)])
        }, new Map<string, number[]>())
    return listed([...kinds].map(([key, places]) => {
        const [name = '', register = ''] = key.split('|')
        return places.length === 1
            ? `das ${name} im ${register} bei ${places.join('')} mm`
            : `die ${PLURALS[name] ?? name} im ${register} bei ${listed(places.map(String))} mm`
    }))
}

// ----------------------------------------------------------------- D3 itself

const usedMotivations = [...new Set(d3Edits.flatMap(edit => ('motivation' in edit && edit.motivation ? [edit.motivation] : [])))]
const d3: Json = {
    '@context': d1['@context'],
    '@type': 'Version',
    '@id': randomUUID(),
    siglum: 'D3',
    system: d1.system,
    basedOn: [{
        '@id': b2['@id'],
        collationTolerance: TOLERANCE_OBJECT,
        '@annotation': believing('likely', [argued(
            `Die Lesung von Peter Phillips zeigt ${bPresent.length} der ${bAdditions.length} Stanzungen, die B zu A `
            + `hinzufügt, an ihrer Stelle, dazu ${inWords(binding.length)} Hinzufügungen von C an deren Stelle und `
            + `${nearOnly.length === 1 ? 'eine weitere' : `${inWords(nearOnly.length)} weitere`} nahebei (siehe B2), außerdem `
            + 'das Crescendo-Paar vor dem Auftakt, '
            + 'das sonst allein Stanford-1 hat. Bei 3459, 8104 und 9042 mm fehlt ihr das An eines Crescendos von B, dessen '
            + 'Ab wirkungslos stehen bleibt. Sie fand diese Betonungen also vor und tilgte deren An. Die Redundanzen von B '
            + 'im Diskant, die C bereinigt, behält sie. Lesarten von A1, B1 oder D1 hat sie nicht. '
            + `An ${inWords(keptFromA.length)} der ${changedByB.length} Stellen, an denen B eine Stanzung von A verschiebt oder `
            + 'tilgt, trägt sie die von A, an den meisten übrigen die von B. Das spricht gegen die Ableitung über B. Doch treffen '
            + 'zufällig gelegte Stanzungen dieser Lesung solche Stellen im Mittel 0,7-mal und bis zu siebenmal, während die '
            + 'Hinzufügungen von C, die B2 begründen, weit über dem liegen, was der Zufall ergibt. Gegenüber D1 ist sie eine '
            + 'eigene Umstanzung: sie beginnt mit einer Löschreihe, die D1 nicht hat, und Trachtmans Lesung von Gourlins '
            + 'Exemplar dieser Fassung nennt das Tempo 75, wo Chases Exemplar von D1 80 nennt.')])
    }],
    creation: d1.creation,
    motivations: usedMotivations.map(id => ({ '@type': 'motivation', '@id': id, note: MOTIVATIONS[id] })),
    edits: d3Edits
}
document.versions.push(d3)

b2.basedOn = [{
    ...at<Json>(b2.basedOn, 0),
    '@annotation': believing('likely', [argued(
        `B2 ist durch kein Exemplar überliefert. Die Licensee-Fassung D3 trägt ${inWords(binding.length)} Hinzufügungen von C `
        + `an der Stelle, an der C sie hat, innerhalb von ${decimal(SAME_PLACE)} mm und damit so genau wie die Stanzungen, die `
        + `alle Fassungen teilen: ${describeAdditions(complete)} mit beiden Stanzungen, `
        + `${describeAdditions(binding.filter(check => !check.complete))} mit einer von beiden. `
        + nearOnly.map(check => `${capitalized(describeAddition(check.edit))} liegt mit `
            + `${check.distances.length === 2 ? 'beiden Stanzungen' : 'ihrer Stanzung'} ${decimal(Math.abs(median(check.distances)))} mm `
            + `${median(check.distances) < 0 ? 'vor' : 'hinter'} der Stelle von C, knapp außerhalb dieser Genauigkeit, und `
            + 'gehört wohl ebenfalls hierher, denn zwei unabhängige Paare so nah beieinander sind weniger wahrscheinlich. ').join('')
        + `Die übrigen ${cAdditions.length} Stanzungen, die C hinzufügt, trägt sie nicht an deren Stelle, darunter alle `
        + `${mittelstimmen.length} Paare der Differenzierung der Mittelstimmen. Auch die Bereinigungen von C und die `
        + 'Verschiebung des c′ in T. 4 teilt sie nicht. Eine gleiche Hinzufügung an gleicher Stelle wird kaum unabhängig vorgenommen, und '
        + 'bestehende Differenzierungen werden nicht mutwillig zurückgenommen. C und D3 gehen daher auf eine gemeinsame '
        + 'Vorlage nach B zurück. Das Forzando ab bei 4287 mm macht dabei das An von B bei 4334 mm wirksam, das '
        + 'nach dem offenen Forzando an bei 4050 mm redundant war. Eine Einfügung, die eine Redundanz wirksam macht, ist '
        + 'sonst nicht anzunehmen. Hier liest sie sich als Korrektur dieses offenen Forzandos.')])
}]

phillips.readFrom = {
    kind: 'reading',
    actor: person('Phillips, Peter'),
    device: person('pneumatischer Rollenleser von Peter Phillips'),
    date: dated('2014-01-01', believing('possible', [adopted(
        'Der Kopf der Datei nennt © Peter Phillips 2014. Wann gelesen wurde, sagt er nicht, das Jahr ist daraus nur '
        + 'zu vermuten. Der Erste des Jahres vertritt es.')])),
    output: 'Traumerei (Schumann) Grunfeld LW e.mid, am 15. September 2026 von Peter Phillips geschickt',
    note: 'Die e-Roll-Datei ist die unbearbeitete Ausgabe von Phillips\' pneumatischem Rollenleser: jede Spur schreibt '
        + 'beim Durchlauf ihrer Perforation einen MIDI-Ton, alle mit derselben Anschlagstärke. Die Nummern sind nach seiner '
        + 'Regel gelesen: ein Ton trägt die MIDI-Nummer seiner Tonhöhe, eine Ausdrucksspur ihre Position auf der '
        + 'Licensee-Leiste plus 15. Die Zeiten sind über die Töne auf die Achse '
        + `der Edition gelegt: ${placement.aligned} der ${placement.notes} Töne sind als Tonfolge an C ausgerichtet, eine `
        + 'Parabel nimmt den Aufwickelzug auf und eine laufende Mediane über dreizehn Töne die örtlichen Dehnungen des '
        + `umgestanzten Papiers, von der die Töne um ${decimal(placement.deviation.p50, 2)} mm (Median) abweichen. `
        + `Ausdrucksstanzungen liegen danach im Median ${decimal(expressionOffset)} mm hinter ihren Symbolen und streuen `
        + `darum mit ${decimal(median(precision))} mm (Median) und ${decimal(quantile(precision, 0.95))} mm (95 %). Ein `
        + 'Schalter bleibt länger offen, als die Perforation lang ist, so dass Enden hier später liegen. Spur 8, das An '
        + 'des Pianozugs, kommt in der ganzen Datei nicht vor, und ob der Leser diese Spur liest, ist nicht bekannt. '
        + 'Phillips\' Standard-MIDI-Datei desselben Exemplars ist dieselbe Lesung, um 1274 Ticks versetzt.'
}

const gourlin: Json = {
    '@type': 'RollCopy',
    '@id': randomUUID(),
    ops: [],
    measurements: {},
    conditions: [],
    modifications: [],
    features: [],
    keeper: person('Philippe Gourlin'),
    production: { system: chase.production.system, date: notBefore1916() },
    readFrom: {
        kind: 'emulation',
        actor: person('Trachtman, Warren'),
        device: person('MK4 with capstan transport'),
        date: dated('2007-03-12', believing('likely', [adopted('Der Kopf der MIDI-Datei nennt den 12. März 2007 als Tag des Scans.')])),
        output: TRACHTMAN_FILE,
        software: [
            { name: 'WSTco Expression Emulator', version: 'Beta Version 1, July 09, 2006' },
            { name: 'CIS to ScanImageMIDI converter', version: 'Beta Version, Feb. 23, 2007' }
        ],
        note: 'Bekannt ist dieses Exemplar allein aus Warren Trachtmans emulierter MIDI-Datei, die unter '
            + 'pianorollmusic.org öffentlich liegt. Ihr Kopf nennt die Rollennummer C-225, das Tempo 75, die Echtheit '
            + '„Original“ und Philippe Gourlin als Eigentümer. Diese Angaben lassen sich nicht anderweitig belegen. Trachtman '
            + 'hat die Rolle mit 300 Zeilen auf den Zoll gescannt, am 17. März 2007 in eine e-Roll-Datei umgewandelt und deren '
            + 'Ausdruck emuliert. Die Datei enthält daher Töne mit Anschlagstärken und das Dämpferpedal, aber keine '
            + 'Ausdrucksstanzungen, und für den Pianozug schreibt die Emulation kein Signal.'
    },
    carries: [{
        '@id': d3['@id'],
        '@annotation': believing('likely', [inferred(
            'Töne und Dämpferpedal stimmen mit Phillips\' Lesung überein. Es weichen allein ein cis′′ in T. 14, das hier '
            + 'eine Lücke von 3 mm hat, vermutlich eine fehlende Stanzung dieses Exemplars, und ein doppeltes Ab des Pedals '
            + 'bei 4468 mm ab. Die Anschlagstärken folgen der Dynamik, die Phillips\' Stanzungen zeigen, geprüft in deren '
            + 'Kodierung. Wo das Verfahren sie überhaupt unterscheiden kann, sind die Hinzufügungen von C vorhanden, die D3 '
            + 'trägt (sieben Einheiten, gepoolter z-Wert +1,15 ± 0,23), es fehlen die Stanzungen von B, die D3 tilgt (vier '
            + 'Einheiten, −1,26 ± 0,10), und es fehlt die Differenzierung der Mittelstimmen (−1,00 ± 0,18). Auf Phillips\' '
            + 'eigener Standard-MIDI-Datei gibt dasselbe Verfahren wieder, was seine Stanzungen zeigen, außer vor dem ersten Ton, wo '
            + 'das Crescendo-Paar vor dem Auftakt daher allein durch Phillips\' Lesung bezeugt ist. Eine Änderung durch den '
            + 'Pianozug zeigen die Anschlagstärken in T. 8′ bis 15 nicht.',
            [archived('an/recon/eroll_test.py'), archived('an/recon/eroll_test.txt'), archived('an/expr2/soft_test.json'), d3['@id']])])
    }]
}
document.copies.push(gourlin)
document['@included'] = [...(document['@included'] ?? []), {
    '@id': { '@id': gourlin['@id'], carries: [{ '@id': d1['@id'] }] },
    annotation: randomUUID(),
    belief: {
        '@type': 'belief',
        '@id': randomUUID(),
        certainty: 'unlikely',
        reasons: [inferred(
            'Die Lesarten, die D1 zu C hinzufügt, fehlen, darunter das vorgezogene c in T. 23, und die Differenzierung '
            + 'der Mittelstimmen, die D1 von C hat, fehlt ebenfalls (gepoolter z-Wert −1,00 ± 0,18).',
            [archived('an/recon/eroll_test.txt'), archived('an/findings.md'), d1['@id']])]
    }
}]

// ------------------------------------------------------------------ checks

const where = (x: number) => x.toFixed(1)
const describeSymbol = (symbol: Json) => {
    const span = spanOf(symbol)
    return `${readingOfSymbol(symbol)}${span ? ` ${where(span.from)}–${where(span.to)}` : ''}`
}

const d3Shown = symbolsShownBy(document, d3)
const onPhillips = (symbol: Json) => (symbol.carriers ?? []).filter((carrier: Json) => copyOfFeature.get(carrier['@id']) === phillips['@id'])
const shownInCoverage = d3Shown.filter(symbol => inCoverage(spanOf(symbol, T100_COPIES)?.from ?? spanOf(symbol)?.from ?? -Infinity))
const carriedTwice = d3Shown.filter(symbol => onPhillips(symbol).length > 1)
const uncarried = shownInCoverage.filter(symbol => onPhillips(symbol).length === 0)
const carriedFeatures = d3Shown.flatMap(onPhillips).map((carrier: Json) => carrier['@id'])
const idleFeatures = phillipsFeatures.filter(feature => !carriedFeatures.includes(feature['@id']))

console.log([
    `Lesung Phillips: ${placement.aligned} von ${placement.notes} Tönen ausgerichtet, Abstand zur laufenden Mediane p50 `
    + `${placement.deviation.p50.toFixed(2)}, p95 ${placement.deviation.p95.toFixed(2)} mm; Abdeckung ${where(placement.covered.from)}–${where(placement.covered.to)} mm`,
    `Ausdruck: Versatz ${expressionOffset.toFixed(2)} mm, Streuung p50 ${median(precision).toFixed(2)}, p95 ${quantile(precision, 0.95).toFixed(2)} mm`,
    `B: ${bPresent.length} von ${bAdditions.length} Hinzufügungen an ihrer Stelle; C: ${cAdditions.length} eigene Stanzungen, ${mittelstimmen.length} Mittelstimmen-Edits`,
    `Stanzungen von A, die B ändert: ${changedByB.length}; die Lesung zeigt die von A bei ${keptFromA.length}, die von B bei ${followsB.length}`,
    'B2-Prüfung (örtlicher Versatz):',
    ...sharedCheck.map(s => `   ${s.binds ? 'bindet' : 'BINDET NICHT'}: ${s.edit.insert.map(describeSymbol).join(', ')} [${s.distances.map(d => d.toFixed(1)).join(', ')}]`),
    `D3: ${d3Edits.length} Bearbeitungen, ${collated.length} Symbole von B2 durch Phillips' Lesung getragen`,
    ...groups.map((group, k) => {
        const edit = at(d3Edits, k)
        const label = [edit.editType, edit.motivation].filter(Boolean).join(' / ') || '–'
        return `   [${label}] ${group.removes.map(s => `-${describeSymbol(s)}`).join(' ')} ${group.adds.map(f => `+${readingOfFeature(f)} ${where(f.horizontal.from)}–${where(f.horizontal.to)}`).join(' ')}`
    })
].map(line => '  ' + line).join('\n'))

finish(document, [], [
    ...structuralProblems(document),
    ...changedTexts(document, textsBefore, ['B', 'B2', 'D3']).map(siglum => `the text of ${siglum} changed`),
    ...sharedCheck.filter(check => check.distances.every(d => Math.abs(d) > TOLERANCE))
        .map(check => `B2 takes edit ${check.edit['@id']}, which the reading does not show`),
    ...(binding.length > 0 ? [] : ['no edit of B2 lies on the reading where C has it']),
    ...(textOf(document, b).size === (textsBefore.get('B')?.size ?? 0) + leaderPair.length ? [] : ['B gained more than the leader pair']),
    ...carriedTwice.map(symbol => `D3 reads ${describeSymbol(symbol)} off two of Phillips's features`),
    ...uncarried.map(symbol => `D3 shows ${describeSymbol(symbol)} within the reading, which no feature of it carries`),
    ...idleFeatures.map(feature => `Phillips's feature ${feature['@id']} carries nothing D3 shows`)
])
