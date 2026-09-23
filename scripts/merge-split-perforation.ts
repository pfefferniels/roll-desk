/**
 * Reads the c′ of bar 8′ on the Chase copy of WM 225 as one perforation.
 *
 * The scan shows a chain of single punches whose first bridge, at 1.6 mm,
 * is about twice as long as the others, presumably a skipped punch step. The
 * reader built two features from the chain, one with the first punch and one
 * without, and version D1 inserted a second c′ for the extra feature, so that
 * it showed two notes of one pitch at once. The two features are merged as
 * linked-rolls' `mergeFeatures` merges them, the skipped step is kept as the
 * hole's condition, and D1 loses the doubled note.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/merge-split-perforation.ts [--write]
 */

import { randomUUID } from 'node:crypto'
import {
    changedTexts, dropUnusedMotivations, finish, insertionsIn, Json, parentOf,
    readEdition, removeInsertion, structuralProblems, symbolsShownBy, textOf, textsOf, versionBy
} from './storedEdition'

const CHASE = '6e1ce072-7490-44b6-b8e8-eb1bbffc3cad'
const SPLIT = ['70425f88-16dc-4cce-8228-0082cfc2cbd2', '2866eb24-1235-44e9-8738-4d4460f95dbc']

const document = readEdition()
const textsBefore = textsOf(document)
const copy = document.copies.find((c: Json) => c['@id'] === CHASE)
if (!copy) throw new Error('no Chase copy')

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

/** A feature without what may differ between the parts of one: its id, place, depiction and condition. */
const natureOf = (feature: Json): Json =>
    Object.fromEntries(Object.entries(feature).filter(([key]) => !['@id', 'horizontal', 'depiction', 'condition'].includes(key)))

const readingOf = (symbol: Json): string =>
    symbol['@type'] === 'note' ? `note ${symbol.pitch}` : `${symbol.expressionType} ${symbol.scope}`

/** The one feature covering all the parts, in the place of the first. */
const mergeFeatures = (parts: Json[]): string => {
    const [first, ...rest] = parts
    if (!first || rest.length === 0) throw new Error('fewer than two features to merge')
    if (rest.some(part => !sameJson(natureOf(part), natureOf(first)))) throw new Error('the features differ in more than their place')
    if (parts.filter(part => part.condition).length > 1) throw new Error('more than one of the features states a condition')

    const merged: Json = {
        ...(parts.find(part => part.condition) ?? first),
        '@id': randomUUID(),
        horizontal: {
            ...first.horizontal,
            from: Math.min(...parts.map(part => part.horizontal.from)),
            to: Math.max(...parts.map(part => part.horizontal.to))
        },
        condition: {
            conditionType: 'missing-perforation',
            description: 'Nach der ersten Stanzung der Kette fehlt vermutlich ein Stanzschritt: die Brücke misst im Scan '
                + '1,6 mm, die übrigen 0,8 bis 0,9 mm.'
        }
    }
    delete merged.depiction

    const replaced = new Set(parts.map(part => part['@id']))
    copy.features = copy.features
        .filter((feature: Json) => feature === first || !replaced.has(feature['@id']))
        .map((feature: Json) => feature === first ? merged : feature)

    // A symbol that named any of the parts names the merged feature, and names it once.
    document.versions.flatMap(insertionsIn).forEach((symbol: Json) => {
        const naming = (carrier: Json) => replaced.has(carrier['@id'])
        const firstNaming = (symbol.carriers ?? []).find(naming)
        if (!firstNaming) return
        symbol.carriers = symbol.carriers
            .filter((carrier: Json) => carrier === firstNaming || !naming(carrier))
            .map((carrier: Json) => carrier === firstNaming ? { ...carrier, '@id': merged['@id'] } : carrier)
    })
    return merged['@id']
}

/** The symbols a version inserts although its parent already shows the same reading on the same features. */
const doublesIn = (version: Json): Json[] => {
    const parent = parentOf(document, version)
    if (!parent) return []
    const held = symbolsShownBy(document, parent)
    const carrierIds = (symbol: Json): string[] => (symbol.carriers ?? []).map((c: Json) => c['@id'])
    return insertionsIn(version).filter(symbol => carrierIds(symbol).length > 0 && held.some(other =>
        readingOf(other) === readingOf(symbol) && carrierIds(symbol).every(id => carrierIds(other).includes(id))))
}

const parts = copy.features.filter((feature: Json) => SPLIT.includes(feature['@id']))
const mergedId = parts.length > 1 ? mergeFeatures(parts) : undefined

const d1 = versionBy(document, 'D1')
const doubled = doublesIn(d1)
doubled.forEach(symbol => removeInsertion(d1, symbol['@id']))
const unused = dropUnusedMotivations(d1)

const leftoverReferences = SPLIT.filter(id => JSON.stringify(document).includes(id))
const featuresReadTwice = document.versions.flatMap((version: Json) => {
    const keys = symbolsShownBy(document, version).flatMap(symbol =>
        (symbol.carriers ?? []).map((c: Json) => `${c['@id']} ${readingOf(symbol)}`))
    return keys.filter((key, i) => keys.indexOf(key) !== i).map(key => `${version.siglum} reads ${key} twice`)
})
const doublesElsewhere = document.versions.flatMap((version: Json) =>
    doublesIn(version).map(symbol => `${version.siglum} inserts ${symbol['@id']}, a reading its parent shows on the same features`))
const expectedTextOfD1 = [...(textsBefore.get('D1') ?? [])].filter(id => !doubled.some(symbol => symbol['@id'] === id))
const textOfD1 = textOf(document, d1)
const d1Differs = expectedTextOfD1.length !== textOfD1.size || expectedTextOfD1.some(id => !textOfD1.has(id))

finish(document, [
    mergedId
        ? `Exemplar Chase: zwei Merkmale des c′ bei 5242 mm als eine Perforation gelesen (${mergedId}), der fehlende Stanzschritt als Zustand vermerkt`
        : 'Exemplar Chase: die Merkmale des c′ bei 5242 mm sind schon zusammengeführt',
    `D1: ${doubled.length} doppelte Lesart getilgt`
    + (unused.length ? `, nicht mehr gebrauchte Begründung ${unused.join(', ')} entfernt` : '')
], [
    ...structuralProblems(document),
    ...changedTexts(document, textsBefore, ['D1']).map(siglum => `the text of ${siglum} changed`),
    ...leftoverReferences.map(id => `the replaced feature ${id} is still named`),
    ...featuresReadTwice,
    ...doublesElsewhere,
    ...(d1Differs ? ['the text of D1 changed by more than the doubled note'] : [])
])
