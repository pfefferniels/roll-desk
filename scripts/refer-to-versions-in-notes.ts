/**
 * Makes the notes refer to versions instead of naming them, and takes the
 * stored sigla out of the edition. What a version is called is read off
 * the stemma by `siglaOf`, so a label written into the prose would go
 * stale the moment the stemma changes. A note now holds `{{<id>}}` where
 * a version was named, and the viewer puts the current siglum there.
 *
 * Two sentences looked back at an earlier stemma, naming the layer B1
 * that was dissolved on 15 September 2026. They are rewritten to say what
 * the readings are, not what they were once called.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/refer-to-versions-in-notes.ts [--write]
 */

import { finish, Json, readEdition, structuralProblems, textOf } from './storedEdition'

/** The sentences that looked back at a former state of the stemma, and what they say now. */
const REWORDINGS: readonly { before: string, after: string }[] = [
    {
        before: 'besser als der von R1, R1.1, R2 oder der Schicht, die damals allein St1 zugeschrieben war (B1):',
        after: 'besser als der von R1, R1.1 und R2:'
    },
    {
        before: 'Die Lesarten, die damals allein St1 zugeschrieben waren (Schicht B1), die sieben Entfernungen',
        after: 'Die Lesarten, die allein St1 überliefert, die sieben Entfernungen'
    }
]

/** How often each siglum stands in the notes once the two sentences are rewritten. */
const EXPECTED: Record<string, number> = {
    R1: 44, R2: 47, R3: 10, R4: 25, 'R1.1': 9, 'R4.1': 1, L1: 14, L2: 6, G1: 0
}

const document = readEdition()
const versions: Json[] = document.versions ?? []
const problems: string[] = []

if (versions.every((version: Json) => version.siglum === undefined)) {
    console.log('  Die Notizen verweisen schon, die Siglen stehen nicht mehr im Dokument')
    process.exit(0)
}

const textsBefore = new Map<string, Set<string>>(
    versions.map((version: Json) => [version['@id'], textOf(document, version)]))

const idBySiglum = new Map<string, string>(
    versions.map((version: Json) => [version.siglum, version['@id']]))

const sigla = [...idBySiglum.keys()].sort((one, other) => other.length - one.length)
// A siglum may end a sentence, so only a dot that carries a number after
// it belongs to the siglum and keeps the match from being a shorter one.
const TOKEN = new RegExp(`(?<![A-Za-z0-9.])(${sigla.map(siglum => siglum.replace('.', '\\.')).join('|')})(?![A-Za-z0-9]|\\.[0-9])`, 'g')

const found = new Map<string, number>(sigla.map(siglum => [siglum, 0]))
const notes: string[] = []

const reword = (note: string): string => {
    const said = REWORDINGS.reduce((current, { before, after }) => current.split(before).join(after), note)
    return said.replace(TOKEN, siglum => {
        found.set(siglum, (found.get(siglum) ?? 0) + 1)
        return `{{${idBySiglum.get(siglum)}}}`
    })
}

const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk)
    if (!value || typeof value !== 'object') return
    const holder = value as Json
    for (const [key, inner] of Object.entries(holder)) {
        if (key === 'note' && typeof inner === 'string') notes.push(holder[key] = reword(inner))
        else walk(inner)
    }
}

for (const { before } of REWORDINGS) {
    const times = JSON.stringify(document).split(JSON.stringify(before).slice(1, -1)).length - 1
    if (times !== 1) problems.push(`the sentence about a former state stands ${times} times, once expected`)
}

walk(document)
versions.forEach((version: Json) => { delete version.siglum })

const known = new Set<string>()
const collect = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(collect)
    if (!value || typeof value !== 'object') return
    const holder = value as Json
    if (typeof holder['@id'] === 'string') known.add(holder['@id'])
    Object.values(holder).forEach(collect)
}
collect(document)

const unresolved = notes.flatMap(note => [...note.matchAll(/\{\{([^{}]+)\}\}/g)]
    .flatMap(match => match[1] ? [match[1]] : [])
    .filter(id => !known.has(id)))

const changed = versions
    .filter((version: Json) => {
        const was = textsBefore.get(version['@id']) ?? new Set<string>()
        const is = textOf(document, version)
        return was.size !== is.size || [...was].some(id => !is.has(id))
    })
    .map((version: Json) => version['@id'])

finish(document, [
    ...sigla.map(siglum => `${siglum} → Verweis, ${found.get(siglum)} mal`),
    'Die beiden Sätze über die frühere Schicht B1 sagen jetzt, was die Lesarten sind',
    'Die Siglen stehen nicht mehr im Dokument; sie werden aus dem Stemma gelesen'
], [
    ...problems,
    ...Object.entries(EXPECTED)
        .filter(([siglum, times]) => found.get(siglum) !== times)
        .map(([siglum, times]) => `"${siglum}" stands ${found.get(siglum)} times in the notes, ${times} expected`),
    ...unresolved.map(id => `a note refers to ${id}, which the edition does not hold`),
    ...notes.filter(note => /\bB1\b/.test(note)).map(() => 'a note still names the dissolved B1'),
    ...structuralProblems(document),
    ...changed.map(id => `the text of ${id} changed`)
])
