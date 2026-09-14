/**
 * Revises the Widuch layer of the edition of WM 225 by the rules of the
 * dissertation (04-varianten.tex): edits add, shift or clean up punches, and
 * an insertion never makes an existing redundancy meaningful.
 *
 * Version B deletes readings that only the Widuch copy carries, while those
 * readings sat in A1, so B deleted what its parent never held. Nearly all of
 * them are either shifted by B to a place close by or resolve a redundancy
 * version A would otherwise hold, and so belong to A. Two groups stay with
 * A1: the rapid soft-pedal changes of bar 9, which A1 adds in place of A's
 * plain release, and the rewind hole.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/revise-widuch-layer.ts [--write]
 */

import { randomUUID } from 'node:crypto'
import {
    changedTexts, danglingDeletions, dropUnusedMotivations, editsOf, finish, insertionsIn, Json, likely,
    principalOf, pruneEdits, readEdition, removeDeletion, removeInsertion, structuralProblems, textOf, textsOf, versionBy
} from './storedEdition'

const WIDUCH = 'a7ff95b7-f43a-4341-ba86-80fa4e84499c'

const document = readEdition()

const featureIndex = new Map<string, { copy: string, from: number }>(
    document.copies.flatMap((copy: Json) => (copy.features ?? []).map((feature: Json) =>
        [feature['@id'], { copy: copy['@id'], from: feature.horizontal.from }] as const)))

const homeOf = (id: string): Json | undefined =>
    document.versions.find((version: Json) => insertionsIn(version).some(symbol => symbol['@id'] === id))

const symbolById = (id: string): Json => {
    const symbol = document.versions.flatMap(insertionsIn).find((s: Json) => s['@id'] === id)
    if (!symbol) throw new Error(`no symbol ${id}`)
    return symbol
}

const placeOf = (symbol: Json): number => {
    const places = (symbol.carriers ?? []).map((c: Json) => featureIndex.get(c['@id'])?.from).filter((p: number | undefined) => p !== undefined)
    return places.reduce((sum: number, p: number) => sum + p, 0) / places.length
}

const carriedOnlyByWiduch = (symbol: Json): boolean =>
    (symbol.carriers ?? []).length > 0
    && (symbol.carriers ?? []).every((c: Json) => featureIndex.get(c['@id'])?.copy === WIDUCH)

/** The one symbol of that reading at that place, wherever it is inserted. */
const symbolAt = (expressionType: string, scope: string, place: number): Json => {
    const found = document.versions.flatMap(insertionsIn).filter((s: Json) =>
        s.expressionType === expressionType && s.scope === scope && Math.abs(placeOf(s) - place) < 1.5)
    if (found.length !== 1) throw new Error(`${found.length} symbols ${expressionType} ${scope} at ${place}`)
    return found[0]
}

/** Moves a symbol from the version that inserts it into the archetype's text. */
const liftIntoA = (id: string) => {
    const home = homeOf(id)
    if (!home || home.siglum === 'A') return
    const symbol = symbolById(id)
    removeInsertion(home, id)
    const text = editsOf(versionBy(document, 'A')).reduce((largest, edit) =>
        (edit.insert?.length ?? 0) > (largest.insert?.length ?? 0) ? edit : largest)
    text.insert.push(symbol)
}

/** Joins the edits of one step that the collation left apart. */
const mergeEditsWith = (version: Json, ids: string[]) => {
    const touches = (edit: Json) =>
        (edit.insert ?? []).some((s: Json) => ids.includes(s['@id'])) || (edit.delete ?? []).some((d: string) => ids.includes(d))
    const [first, ...rest] = editsOf(version).filter(touches)
    if (!first || rest.length === 0) return
    const parts = [first, ...rest]
    const motivations = new Set(parts.map(edit => edit.motivation))
    if (motivations.size > 1) throw new Error(`edits to merge carry different motivations: ${[...motivations].join(', ')}`)
    const [belief, ...moreBeliefs] = parts.filter(edit => edit['@annotation'])
    if (moreBeliefs.length > 0) throw new Error('edits to merge carry more than one belief')
    first.insert = parts.flatMap(edit => edit.insert ?? [])
    first.delete = parts.flatMap(edit => edit.delete ?? [])
    if (belief) first['@annotation'] = belief['@annotation']
    version.edits = editsOf(version).filter(edit => !rest.includes(edit))
    pruneEdits(version)
}

const textsBefore = textsOf(document)
const sizeBefore = (siglum: string): number => textsBefore.get(siglum)?.size ?? 0

const a1 = versionBy(document, 'A1')
const b = versionBy(document, 'B')

const flicker = ([
    ['SoftPedalOff', 5507.0], ['SoftPedalOn', 5534.9], ['SoftPedalOff', 5549.4],
    ['SoftPedalOn', 5563.9], ['SoftPedalOff', 5583.5], ['SoftPedalOn', 5666.8]
] as const).map(([type, place]) => symbolAt(type, 'bass', place))
const plainRelease = [symbolAt('SoftPedalOff', 'bass', 5315.6), symbolAt('SoftPedalOn', 'bass', 5770.6)]
const unaCordaOfBar13 = symbolAt('SoftPedalOn', 'bass', 6250.4)
const keptInA1 = new Set([
    ...flicker.map(s => s['@id']),
    ...insertionsIn(a1).filter(s => s.expressionType === 'Rewind').map(s => s['@id'])
])

// B deleted these while A1 held them: each belongs to A unless it is A1's own.
const lifted = danglingDeletions(document, b)
    .filter(id => !keptInA1.has(id))
    .filter(id => homeOf(id)?.siglum === 'A1' && carriedOnlyByWiduch(symbolById(id)))
lifted.forEach(liftIntoA)
danglingDeletions(document, b).forEach(id => removeDeletion(b, id))

// A1 deletes the crescendo release of bar 2 that B inserted; it belongs to A
// (abb-18 of the dissertation), like the plain soft-pedal release of bars 8′–10.
const liftedForA1 = [
    ...danglingDeletions(document, a1),
    ...plainRelease.map(symbol => symbol['@id']).filter(id => homeOf(id)?.siglum !== 'A')
]
liftedForA1.forEach(liftIntoA)

const gradualLift = 'una-corda-lifted-gradually'
if (!editsOf(a1).some(edit => edit.motivation === gradualLift)) {
    flicker.forEach(symbol => removeInsertion(a1, symbol['@id']))
    a1.motivations.push({
        '@type': 'motivation', '@id': gradualLift,
        note: 'Allmähliches Aufheben der Verschiebung durch rasch wechselnde Stanzungen des Pianozugs'
    })
    a1.edits.push({
        '@type': 'edit', '@id': randomUUID(),
        motivation: gradualLift,
        insert: flicker,
        delete: plainRelease.map(s => s['@id']),
        '@annotation': likely(
            'Die rasch wechselnden Stanzungen des Pianozugs in T. 9 trägt allein das Exemplar Widuch. Keine Kopie '
            + 'zeigt hier eine Redundanz, die diese Stanzungen erklären müssten, und spätere Fassungen fügen in der '
            + 'Regel Nuancen hinzu. Sie gelten daher als Zusatz dieser Fassung, die dafür Beginn und Ende der '
            + 'schlichten Aufhebung aus A verlegt. Denkbar bleibt, dass sie schon in A standen und B sie tilgte, etwa '
            + 'weil der schnelle Wechsel störende Geräusche verursachte. Dann nähme B vier wirksame Stanzungen zurück '
            + 'und verlegte zwei.')
    })
}

const removalOfBar13 = editsOf(b).find(edit => (edit.delete ?? []).includes(unaCordaOfBar13['@id']))
if (!removalOfBar13) throw new Error('B does not delete the una corda of bar 13')
removalOfBar13.motivation = 'extend-area-without-una-corda'
removalOfBar13['@annotation'] ??= likely(
    'Das An des Pianozugs bei 6250,4 mm trägt allein das Exemplar Widuch. Ohne es stünde schon in A bei 6338,5 mm '
    + 'ein zweites Ab ohne Wirkung, wie es Stanford-1 und Stanford-2 tragen. Eine spätere Einfügung, die eine '
    + 'bestehende Redundanz nachträglich erklärt, ist unwahrscheinlich. Also steht das An in A, und B hat es getilgt '
    + 'und das Ab stehen lassen.')

// Three steps of B are spread over several edits each.
mergeEditsWith(b, [symbolAt('SlowCrescendoOn', 'bass', 2149.4), symbolAt('SlowCrescendoOn', 'bass', 2161.3)].map(s => s['@id']))
mergeEditsWith(b, [symbolAt('SlowCrescendoOff', 'treble', 5584.3), symbolAt('SlowCrescendoOn', 'treble', 5627.8), symbolAt('SlowCrescendoOn', 'treble', 5589.1)].map(s => s['@id']))
mergeEditsWith(b, [symbolAt('SlowCrescendoOff', 'treble', 6466.2), symbolAt('SlowCrescendoOn', 'treble', 6503.3), symbolAt('SlowCrescendoOn', 'treble', 6457.6)].map(s => s['@id']))

// D1 removes a soft-pedal release in bar 13 that has no effect: the pedal was already released.
const d1 = versionBy(document, 'D1')
const heldPedal = d1.motivations.find((m: Json) => m['@id'] === 'soft-pedal-held')
if (heldPedal) {
    heldPedal['@id'] = 'redundant-soft-pedal-release'
    heldPedal.note = 'Das zweite, wirkungslose Ab des Pianozugs entfällt'
    editsOf(d1).filter(edit => edit.motivation === 'soft-pedal-held').forEach(edit => { edit.motivation = heldPedal['@id'] })
}

const ownAdditions = insertionsIn(a1).filter(s => !keptInA1.has(s['@id']))
const ownDeletions = editsOf(a1).flatMap(edit => edit.delete ?? []).filter((id: string) => !plainRelease.some(s => s['@id'] === id))
if (ownAdditions.length !== 5 || ownDeletions.length !== 2) {
    throw new Error(`A1 holds ${ownAdditions.length} additions and ${ownDeletions.length} deletions of its own, where the note names 5 and 2`)
}
const textOfA = textOf(document, versionBy(document, 'A'))
const widuchReadingsInA = [...textOfA].filter(id => carriedOnlyByWiduch(symbolById(id))).length
const derivationOfA1 = principalOf(a1)
if (!derivationOfA1?.['@annotation']) throw new Error('A1 states no belief about its derivation')
derivationOfA1['@annotation'].belief.reasons = [{
    '@type': 'simpleArgumentation',
    note: 'Die Fassung A1 umfasst, was allein das Exemplar Widuch trägt und worauf kein anderer Ast antwortet: das '
        + 'allmähliche Aufheben der Verschiebung in T. 9, die Rückspulstanzung, fünf Crescendo- und Forzando-Befehle '
        + 'in T. 2, 6 und 7 sowie zwei Tilgungen, das Ab des Diskant-Crescendos bei 1708,6 mm und das Loslassen des '
        + `Dämpferpedals bei 5370,9 mm. Weitere ${widuchReadingsInA} Lesarten trägt ebenfalls allein dieses Exemplar, `
        + 'sie stehen aber schon in A. An den meisten dieser Stellen trägt B nahebei einen gleichartigen Befehl und '
        + 'hat die Lesart also verschoben. An den übrigen löst sie eine Redundanz auf, die A sonst hätte, und eine '
        + 'spätere Einfügung erklärt keine bestehende Redundanz nachträglich.'
}]

const unusedMotivations = document.versions.flatMap((v: Json) => dropUnusedMotivations(v).map(id => `${v.siglum}: ${id}`))
document.versions.forEach(pruneEdits)

finish(document, [
    `A: ${lifted.length} Lesarten allein des Exemplars Widuch aus A1 übernommen, die B verschiebt oder tilgt`,
    `A: ${liftedForA1.length} Lesarten aus B übernommen, die A1 tilgt (Crescendo-Ab in T. 2, schlichte Aufhebung der Verschiebung in T. 8′–10)`,
    'A1: das allmähliche Aufheben der Verschiebung als eine Bearbeitung mit Begründung',
    'B: die Tilgung des Pianozugs in T. 13 begründet, drei auf mehrere Bearbeitungen verteilte Schritte zusammengefasst',
    'D1: die Begründung der Tilgung in T. 13 berichtigt',
    `A: ${textOfA.size - sizeBefore('A')} Symbole mehr im Text, ${widuchReadingsInA} davon allein vom Exemplar Widuch getragen`,
    ...(unusedMotivations.length ? [`nicht mehr gebrauchte Begründungen entfernt: ${unusedMotivations.join(', ')}`] : [])
], [
    ...structuralProblems(document),
    ...changedTexts(document, textsBefore, ['A']).map(siglum => `the text of ${siglum} changed`)
])
