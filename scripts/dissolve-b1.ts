/**
 * Dissolves version B1 of WM 225 into B.
 *
 * B1's one remaining reading is a bass crescendo On at 7364.7 mm that only
 * Stanford-1 carries. It stands inside B's crescendo from 7348 to 7396 mm
 * and changes nothing there. An On after an On is the trace of a move: the
 * On stood at 7364.7 first and was brought forward to 7348, the old punch
 * left standing. So the reading belongs to B, B2 removes the leftover, and
 * Stanford-1 witnesses B itself.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/dissolve-b1.ts [--write]
 */

import { randomUUID } from 'node:crypto'
import { changedTexts, decimal, editsOf, finish, Json, likely, readEdition, structuralProblems, textOf, textsOf, versionBy } from './storedEdition'

const STANFORD_1 = 'd229954b-086c-44d6-a589-aaa324d31d88'
const CRESCENDO_ON = '2494e2e5-d884-40c9-b25b-a83a7f705809'
const CRESCENDO_OFF = '2148f6b2-e04b-420d-95b8-3f5a5e40f255'

const document = readEdition()
if (!document.versions.some((version: Json) => version.siglum === 'B1')) {
    console.log('  B1 ist schon aufgelöst, nichts zu tun')
    process.exit(0)
}
const textsBefore = textsOf(document)

const b = versionBy(document, 'B')
const b1 = versionBy(document, 'B1')
const b2 = versionBy(document, 'B2')
const d3 = versionBy(document, 'D3')

const median = (values: readonly number[]): number => {
    const sorted = [...values].sort((x, y) => x - y)
    const [lower, upper] = [sorted[(sorted.length - 1) >> 1], sorted[sorted.length >> 1]]
    if (lower === undefined || upper === undefined) throw new RangeError('median of nothing')
    return (lower + upper) / 2
}

const stanford1 = document.copies.find((copy: Json) => copy['@id'] === STANFORD_1)
if (!stanford1) throw new Error('no Stanford-1 copy')
const onStanford1 = (symbol: Json): Json => {
    const feature = stanford1.features.find((f: Json) => (symbol.carriers ?? []).some((c: Json) => c['@id'] === f['@id']))
    if (!feature) throw new Error(`${symbol['@id']} has no carrier on Stanford-1`)
    return feature
}

const [leftover, ...moreInB1] = editsOf(b1).flatMap(edit => edit.insert ?? [])
if (!leftover || moreInB1.length > 0 || editsOf(b1).some(edit => (edit.delete ?? []).length > 0)) {
    throw new Error('B1 is expected to insert exactly one symbol and delete nothing')
}

const [onEdit, offEdit] = [CRESCENDO_ON, CRESCENDO_OFF].map(id => editsOf(b).find(edit => edit['@id'] === id))
if (!onEdit || !offEdit) throw new Error('B lacks the crescendo edits at 7348 and 7396 mm')
const [on, off] = [onEdit.insert?.[0], offEdit.insert?.[0]]
if (!on || !off) throw new Error('the crescendo edits of B insert nothing')

const [onAt, leftoverHole, offAt] = [onStanford1(on).horizontal.from, onStanford1(leftover), onStanford1(off).horizontal.from]
const leftoverAt = leftoverHole.horizontal.from
const insideTheCrescendo = leftover.expressionType === 'SlowCrescendoOn' && leftover.scope === 'bass' && onAt < leftoverAt && leftoverAt < offAt
const crescendoLengths = stanford1.features
    .filter((f: Json) => f['@type'] === 'HoleChain' && [3, 4].includes(f.vertical.from))
    .map((f: Json) => f.horizontal.to - f.horizontal.from)

b.edits = editsOf(b)
    .filter(edit => edit !== offEdit)
    .map(edit => (edit !== onEdit ? edit : {
        ...edit,
        editType: 'additional-accent',
        motivation: 'crescendo-onset-moved',
        insert: [on, leftover, off],
        '@annotation': likely(
            `Das zweite An bei ${decimal(leftoverAt)} mm trägt allein Stanford-1. Es steht im Crescendo von `
            + `${Math.round(onAt)} bis ${Math.round(offAt)} mm und bewirkt dort nichts. Ein An nach einem An ist die Spur einer `
            + `Verschiebung: das An stand zuerst bei ${decimal(leftoverAt)} mm und wurde auf ${Math.round(onAt)} mm vorgezogen, `
            + 'die alte Stanzung blieb stehen. B2 tilgt sie. Die Öffnung misst auf Stanford-1 '
            + `${decimal(leftoverHole.horizontal.to - leftoverAt)} mm, die Crescendo-Öffnungen im Bass dort im Median `
            + `${decimal(median(crescendoLengths))} mm, was eine eigene Stanzung dieses Exemplars nicht ausschließt.`)
    }))
b.motivations = [...(b.motivations ?? []), {
    '@type': 'motivation', '@id': 'crescendo-onset-moved',
    note: 'Das An des Crescendos rückt vor, die alte Stanzung bleibt stehen'
}]

b2.edits = [...editsOf(b2), {
    '@type': 'edit', '@id': randomUUID(), editType: 'remove-redundancy', motivation: 'cleanup-b2', delete: [leftover['@id']]
}]
b2.motivations = [...(b2.motivations ?? []), { '@type': 'motivation', '@id': 'cleanup-b2', note: 'Bereinigung' }]

document.versions = document.versions.filter((version: Json) => version !== b1)

const at0 = (values: Json[] | undefined): Json => {
    const first = values?.[0]
    if (!first) throw new Error('empty list')
    return first
}

/** Rewrites one passage of a note, which must occur exactly once. */
const reword = (holder: Json, before: string, after: string): string[] => {
    const reason = holder.belief.reasons[0]
    const occurrences = reason.note.split(before).length - 1
    if (occurrences !== 1) return [`expected "${before}" once in a note, found it ${occurrences} times`]
    reason.note = reason.note.replace(before, after)
    return []
}
const schmitz = document.copies.find((copy: Json) => (copy.carries ?? []).some((c: Json) => c['@annotation']?.belief?.reasons?.[0]?.note?.includes('oder B1')))
const onC1 = (document['@included'] ?? []).find((statement: Json) => statement.belief?.reasons?.[0]?.note?.startsWith('Die Schicht B1'))
const rewordings = [
    ...reword(at0(d3.basedOn)['@annotation'], 'Lesarten von A1, B1 oder D1 hat sie nicht.', 'Lesarten von A1 oder D1 hat sie nicht.'),
    ...(schmitz
        ? reword(at0(schmitz.carries)['@annotation'], 'besser als der von A, A1, B oder B1:',
            'besser als der von A, A1, B oder der Schicht, die damals allein Stanford-1 zugeschrieben war (B1):')
        : ['no note on Schmitz\'s copy names B1']),
    ...(onC1
        ? [
            ...reword(onC1, 'Die Schicht B1,', 'Die Lesarten, die damals allein Stanford-1 zugeschrieben waren (Schicht B1),'),
            ...reword(onC1, '0,35 für B1', '0,35 für jene Lesarten')
        ]
        : ['no statement about C1 names B1'])
]

const textOfB = textOf(document, b)
const formerB1 = textsBefore.get('B1') ?? new Set<string>()
const bIsFormerB1 = textOfB.size === formerB1.size && [...formerB1].every(id => textOfB.has(id))

finish(document, [
    `B: das An bei ${decimal(leftoverAt)} mm steht im Crescendo ${Math.round(onAt)}–${Math.round(offAt)} mm, mit ihm in einer Bearbeitung zusammengeführt`,
    'B2: tilgt die stehen gebliebene Stanzung',
    'B1 aufgelöst, Stanford-1 bezeugt B',
    'Notizen zu D3, zu Schmitz\' Exemplar und zu C1 umformuliert'
], [
    ...structuralProblems(document),
    ...(insideTheCrescendo ? [] : ['the reading of B1 is not an On inside B\'s crescendo']),
    ...changedTexts(document, textsBefore, ['B']).map(siglum => `the text of ${siglum} changed`),
    ...(bIsFormerB1 ? [] : ['the text of B is not what B1 showed']),
    ...(JSON.stringify(document).includes(b1['@id']) ? ['something still refers to B1'] : []),
    ...rewordings
])
