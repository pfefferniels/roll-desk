/**
 * Names the copies by their sigla in the edition's notes, so that the
 * prose calls a copy what the data calls it.
 *
 * The sentence naming the Licensee copy was written when Chase's was the
 * only one. The symbol it speaks of, the sustain pedal release at 5370.8
 * mm, is carried by St1, St2, Ch1 and Ph1, so the sentence names all four.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/name-copies-in-notes.ts [--write]
 */

import { changedTexts, finish, Json, readEdition, structuralProblems, textsOf } from './storedEdition'

/** Each wording to be replaced, with the number of times it must occur. */
const REWORDINGS: readonly { before: string, after: string, times: number }[] = [
    { before: 'auf Stanford-1, Stanford-2 und der Licensee-Kopie', after: 'auf St1, St2, Ch1 und Ph1', times: 1 },
    { before: 'die grüne Kopie hält', after: 'Bo1 hält', times: 1 },
    { before: 'allein das Exemplar Widuch', after: 'allein Wi1', times: 3 },
    { before: 'vom Exemplar Widuch', after: 'von Wi1', times: 1 },
    { before: 'auf dem Exemplar Widuch', after: 'auf Wi1', times: 1 },
    { before: 'im Exemplar Widuch', after: 'in Wi1', times: 4 },
    { before: 'Stanford-1', after: 'St1', times: 10 },
    { before: 'Stanford-2', after: 'St2', times: 2 }
]

/** Wordings no note may hold afterwards. */
const NAMES = ['Stanford-1', 'Stanford-2', 'Exemplar Widuch', 'Licensee-Kopie', 'grüne Kopie']

const document = readEdition()
const textsBefore = textsOf(document)

const notes: string[] = []
const found = new Map<string, number>(REWORDINGS.map(({ before }) => [before, 0]))

const reword = (note: string): string =>
    REWORDINGS.reduce((current, { before, after }) => {
        found.set(before, (found.get(before) ?? 0) + current.split(before).length - 1)
        return current.split(before).join(after)
    }, note)

const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk)
    if (!value || typeof value !== 'object') return
    const holder = value as Json
    for (const [key, inner] of Object.entries(holder)) {
        if (key === 'note' && typeof inner === 'string') notes.push(holder[key] = reword(inner))
        else walk(inner)
    }
}

if (!JSON.stringify(document).includes('Stanford-1')) {
    console.log('  Die Notizen nennen die Exemplare schon bei ihren Siglen')
    process.exit(0)
}

walk(document)

finish(document, REWORDINGS.map(({ before, after }) => `${found.get(before)} × „${before}“ → „${after}“`), [
    ...REWORDINGS
        .filter(({ before, times }) => found.get(before) !== times)
        .map(({ before, times }) => `"${before}" occurs ${found.get(before)} times in the notes, ${times} expected`),
    ...NAMES
        .filter(name => notes.some(note => note.includes(name)))
        .map(name => `a note still names a copy "${name}"`),
    ...structuralProblems(document),
    ...changedTexts(document, textsBefore).map(siglum => `the text of ${siglum} changed`)
])
