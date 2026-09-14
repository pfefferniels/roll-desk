/**
 * Reading, checking and writing the stored edition of WM 225, for the
 * scripts that change it. The stored JSON-LD document has no type of its
 * own: the library types describe the in-memory edition, not the file.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import Ajv from 'ajv'
import { principalDerivationOf, Version } from 'linked-rolls'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = Record<string, any>

const SCHEMA = new URL('../node_modules/linked-rolls/lib/schema.json', import.meta.url)
const EDITION = new URL('../../welte225.org/edition.jsonld', import.meta.url)

export const readEdition = (): Json => JSON.parse(readFileSync(EDITION, 'utf-8'))

export const versionBy = (document: Json, siglum: string): Json => {
    const version = document.versions.find((v: Json) => v.siglum === siglum)
    if (!version) throw new Error(`no version ${siglum}`)
    return version
}

export const editsOf = (version: Json): Json[] => version.edits ?? []

export const insertionsIn = (version: Json): Json[] => editsOf(version).flatMap(edit => edit.insert ?? [])

export const principalOf = (version: Json): Json | undefined =>
    principalDerivationOf(version as unknown as Version)

export const parentOf = (document: Json, version: Json): Json | undefined => {
    const principal = principalOf(version)
    return principal && document.versions.find((v: Json) => v['@id'] === principal['@id'])
}

export const lineageOf = (document: Json, version: Json): Json[] => {
    const parent = parentOf(document, version)
    return parent ? [...lineageOf(document, parent), version] : [version]
}

/** The ids of the symbols the version shows. */
export const textOf = (document: Json, version: Json): Set<string> => {
    const edits = lineageOf(document, version).flatMap(editsOf)
    const struck = new Set(edits.flatMap(edit => edit.delete ?? []))
    return new Set(edits.flatMap(edit => (edit.insert ?? []).map((s: Json) => s['@id'])).filter(id => !struck.has(id)))
}

export const textsOf = (document: Json): Map<string, Set<string>> =>
    new Map(document.versions.map((v: Json) => [v.siglum, textOf(document, v)]))

/** The symbols the version shows, as the lineage inserts them. */
export const symbolsShownBy = (document: Json, version: Json): Json[] => {
    const text = textOf(document, version)
    return lineageOf(document, version).flatMap(insertionsIn).filter(symbol => text.has(symbol['@id']))
}

/** Drops edits that neither insert nor delete anything, and empty lists within edits. */
export const pruneEdits = (version: Json) => {
    version.edits = editsOf(version)
        .map(edit => Object.fromEntries(Object.entries(edit).filter(([key, value]) =>
            !((key === 'insert' || key === 'delete') && Array.isArray(value) && value.length === 0))))
        .filter(edit => (edit.insert?.length ?? 0) + (edit.delete?.length ?? 0) > 0)
}

export const removeInsertion = (version: Json, id: string) => {
    version.edits = editsOf(version).map(edit =>
        ({ ...edit, insert: (edit.insert ?? []).filter((s: Json) => s['@id'] !== id) }))
    pruneEdits(version)
}

export const removeDeletion = (version: Json, id: string) => {
    version.edits = editsOf(version).map(edit =>
        ({ ...edit, delete: (edit.delete ?? []).filter((d: string) => d !== id) }))
    pruneEdits(version)
}

export const danglingDeletions = (document: Json, version: Json): string[] => {
    const parent = parentOf(document, version)
    const held = parent ? textOf(document, parent) : new Set<string>()
    return editsOf(version).flatMap(edit => edit.delete ?? []).filter((id: string) => !held.has(id))
}

export const dropUnusedMotivations = (version: Json): string[] => {
    const used = new Set(editsOf(version).map(edit => edit.motivation))
    const unused = (version.motivations ?? []).filter((m: Json) => !used.has(m['@id'])).map((m: Json) => m['@id'])
    if (version.motivations) version.motivations = version.motivations.filter((m: Json) => used.has(m['@id']))
    return unused
}

export const likely = (note: string): Json => ({
    '@id': randomUUID(),
    belief: { '@type': 'belief', '@id': randomUUID(), certainty: 'likely', reasons: [{ '@type': 'simpleArgumentation', note }] }
})

/** What no edition should contain: a deletion of what the parent lacks, a symbol inserted twice, an undefined motivation. */
export const structuralProblems = (document: Json): string[] => [
    ...document.versions.flatMap((v: Json) => danglingDeletions(document, v)
        .map(id => `${v.siglum} deletes ${id}, which its parent does not hold`)),
    ...document.versions.flatMap((v: Json) => {
        const ids = lineageOf(document, v).flatMap(insertionsIn).map(s => s['@id'])
        return ids.filter((id, i) => ids.indexOf(id) !== i).map(id => `${v.siglum} inserts ${id} a second time`)
    }),
    ...document.versions.flatMap((v: Json) => editsOf(v)
        .filter(edit => edit.motivation && !(v.motivations ?? []).some((m: Json) => m['@id'] === edit.motivation))
        .map(edit => `${v.siglum} names the undefined motivation ${edit.motivation}`))
]

/** The versions whose text is not what it was, leaving aside those expected to change. */
export const changedTexts = (document: Json, before: Map<string, Set<string>>, exempt: readonly string[] = []): string[] =>
    document.versions
        .filter((v: Json) => !exempt.includes(v.siglum))
        .filter((v: Json) => {
            const was = before.get(v.siglum) ?? new Set<string>()
            const is = textOf(document, v)
            return was.size !== is.size || [...was].some(id => !is.has(id))
        })
        .map((v: Json) => v.siglum)

/** Prints the report, and writes the edition only where it holds to the schema and shows no problem. */
export const finish = (document: Json, report: readonly string[], problems: readonly string[]) => {
    [...report, ...problems.map(problem => `PROBLEM: ${problem}`)].forEach(line => console.log('  ' + line))

    const validate = new Ajv({ formats: { date: /^\d{4}-\d{1,2}-\d{1,2}$/ } })
        .compile(JSON.parse(readFileSync(SCHEMA, 'utf-8')))
    const sound = validate(document)
    console.log(`\n  gegen das Schema: ${sound ? 'gültig' : 'UNGÜLTIG'}`)
    if (!sound || problems.length > 0) {
        if (!sound) console.log(JSON.stringify(validate.errors?.slice(0, 5), null, 2))
        console.error('\n  nicht geschrieben')
        process.exit(1)
    }

    if (process.argv.includes('--write')) {
        // Four spaces and a final newline, as the file is stored, so that a diff shows only what changed.
        writeFileSync(EDITION, JSON.stringify(document, null, 4) + '\n')
        console.log(`\n  geschrieben nach ${EDITION.pathname}`)
    } else {
        console.log('\n  (nichts geschrieben; --write schreibt nach ../welte225.org/edition.jsonld)')
    }
}
