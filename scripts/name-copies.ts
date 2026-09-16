/**
 * Gives every copy of WM 225 the siglum the dissertation names it by: two
 * letters for the collection the copy was read in, and a number counting
 * the copies of the roll within that collection.
 *
 * The script sets the sigla and nothing else, so it can be run again.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/name-copies.ts [--write]
 */

import { changedTexts, finish, Json, readEdition, structuralProblems, textsOf } from './storedEdition'

/** Each siglum, with what tells its copy apart from the others. */
const SIGLA: readonly { siglum: string, keeper: string, scan?: string }[] = [
    { siglum: 'St1', keeper: 'Stanford', scan: 'mf320jq4997' },
    { siglum: 'St2', keeper: 'Stanford', scan: 'wv912mm2332' },
    { siglum: 'Wi1', keeper: 'Collection Marc Widuch' },
    { siglum: 'Ch1', keeper: 'Spencer Chase' },
    { siglum: 'Bo1', keeper: 'Peter Both' },
    { siglum: 'Ph1', keeper: 'Peter Phillips' },
    { siglum: 'Go1', keeper: 'Philippe Gourlin' },
    { siglum: 'Sc1', keeper: 'Hans-W. Schmitz' },
    { siglum: 'Si1', keeper: 'USC Libraries' }
]

const document = readEdition()
const textsBefore = textsOf(document)
const copies: Json[] = document.copies ?? []

const problems: string[] = []
const report: string[] = []
const named = new Set<Json>()

for (const { siglum, keeper, scan } of SIGLA) {
    const found = copies.filter((copy: Json) =>
        copy.keeper?.name === keeper && (scan === undefined || String(copy.scan ?? '').includes(scan)))

    const [copy, ...more] = found
    if (!copy || more.length > 0) {
        problems.push(`${found.length} copies answer to ${keeper}${scan ? ` and ${scan}` : ''}, which should name ${siglum}`)
        continue
    }

    if (copy.siglum && copy.siglum !== siglum) problems.push(`the copy to be named ${siglum} already carries ${copy.siglum}`)
    copy.siglum = siglum
    named.add(copy)
    report.push(`${siglum}: ${keeper}`)
}

for (const copy of copies) {
    if (!named.has(copy)) problems.push(`no siglum for the copy held by ${copy.keeper?.name ?? 'nobody'}`)
}

finish(document, report, [
    ...problems,
    ...structuralProblems(document),
    ...changedTexts(document, textsBefore).map(siglum => `the text of ${siglum} changed`)
])
