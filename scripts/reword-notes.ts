/**
 * Settles the wording of the edition's notes.
 *
 * `TERMS` is the vocabulary as it has been decided: each phrase with what
 * it becomes and how often it is expected, so that a re-run both applies
 * what is new and reports if a settled term has crept back. `REWORDINGS`
 * rewrites a whole note, checking how it begins and refusing to drop a
 * number or a reference.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/reword-notes.ts [--write]
 */

import { finish, Json, readEdition, structuralProblems } from './storedEdition'

interface Rewording {
    /** Where the note sits, as `dump-notes.ts` prints it. */
    path: string
    /** How the note begins now, so that a moved or already reworded note is not overwritten. */
    startsWith: string
    /** The paragraphs of the new note. */
    after: readonly string[]
    /** Numbers the new note leaves out on purpose, because they are made elsewhere. */
    mayDrop?: readonly string[]
}

const REWORDINGS: readonly Rewording[] = [
    // Empty on purpose. A rewording is taken out once it stands in the
    // edition: the notes move on afterwards, through a term settled or a
    // link laid in, and an entry replayed against text that has changed
    // since would put the old wording back. The history holds what was
    // done; this list holds only what is still to do.
]

/**
 * What is fixed wherever a note says it: the stemmatic term for what
 * four notes called a mixing, a typo, the collector's name as the rest
 * of the edition spells it, and the octave mark as a prime.
 *
 * Then the vocabulary of the soft pedal, settled against the
 * dissertation, which writes "das Una Corda-Pedal gedrückt" for the
 * device and "ein graduelles Aufheben der Verschiebung" for its effect.
 * The edition used Verschiebung for both that effect and for a punching
 * being moved; the second sense gives way to Verlegung, which the
 * edition already uses in one place.
 *
 * `times` is what the phrase is expected to occur, so that a phrase that
 * has moved is reported rather than silently missed.
 */
const TERMS: readonly { before: string, after: string, times: number }[] = [
    { before: 'Vermischung', after: 'Kontamination', times: 4 },
    { before: 'innheralb', after: 'innerhalb', times: 1 },
    { before: 'Dennis Condon', after: 'Denis Condon', times: 1 },
    { before: "Akzent auf f'", after: 'Akzent auf f′', times: 1 },

    { before: 'des Pianozugs', after: 'des Una Corda-Pedals', times: 7 },
    { before: 'durch den Pianozug', after: 'durch das Una Corda-Pedal', times: 3 },
    { before: 'für den Pianozug', after: 'für das Una Corda-Pedal', times: 1 },
    { before: 'die Pedale, Pianozug und', after: 'die Pedale, das Una Corda-Pedal und', times: 1 },
    { before: 'des Leisepedals', after: 'des Una Corda-Pedals', times: 1 },
    { before: 'Für die Una corda in T. 13', after: 'Für die Verschiebung in T. 13', times: 1 },

    { before: 'die Spur einer Verschiebung', after: 'die Spur einer Verlegung', times: 1 },
    { before: 'die Verschiebung des c′', after: 'die Verlegung des c′', times: 1 },
    { before: 'Verschiebung auf betonte Zeit', after: 'Verlegung auf betonte Zeit', times: 1 },
    { before: 'verschiebt oder tilgt', after: 'verlegt oder tilgt', times: 3 },
    { before: 'verschoben oder getilgt hat', after: 'verlegt oder getilgt hat', times: 4 },
    { before: 'gleichartig, also verschoben', after: 'gleichartig, also verlegt', times: 1 },
    { before: 'ein verschobenes g', after: 'ein verlegtes g', times: 1 },

    // Typographie: ein gerades Anführungszeichen, neun gerade Genitiv-Apostrophe.
    { before: '„corrigiert"', after: '„corrigiert“', times: 1 },
    { before: "Phillips'", after: 'Phillips’', times: 8 },
    { before: "Schmitz'", after: 'Schmitz’', times: 1 }
]

/** Every number a note gives, which a rewording has to carry over. */
const figuresIn = (note: string): string[] => note.replace(/\{\{[^}]+\}\}/g, ' ').match(/\d+(?:[,.]\d+)?/g) ?? []

/** The versions a note refers to. Dropping one would cost the reader a link. */
const referencesIn = (note: string): string[] => [...new Set(note.match(/\{\{[^}]+\}\}/g) ?? [])]

const noteAt = (document: Json, path: string): Json | undefined =>
    path.split('/').reduce<Json | undefined>((node, step) => node?.[step], document)

/**
 * The note as it reads, so that a rewording counts as done although
 * perforation links have been laid into it since.
 */
const asRead = (note: string) => note.replace(/\{\{[^}|]+\|([^}]*)\}\}/g, '$1')

const document = readEdition()
const report: string[] = []
const problems: string[] = []

REWORDINGS.forEach(({ path, startsWith, after, mayDrop = [] }) => {
    const reason = noteAt(document, path)
    const note: string | undefined = reason?.note
    const text = after.join('\n\n')

    if (!reason || note === undefined) return problems.push(`${path} trägt keine Notiz`)
    if (asRead(note) === asRead(text)) return report.push(`${path} ist schon umformuliert`)
    if (!note.startsWith(startsWith)) return problems.push(`${path} beginnt nicht wie erwartet`)

    const lost = figuresIn(note).filter(figure => !figuresIn(text).includes(figure) && !mayDrop.includes(figure))
    if (lost.length > 0) return problems.push(`${path} verlöre die Zahlen ${lost.join(', ')}`)

    const unlinked = referencesIn(note).filter(reference => !text.includes(reference))
    if (unlinked.length > 0) return problems.push(`${path} verlöre ${unlinked.length} Verweis(e)`)

    reason.note = text
    report.push(`${path}: ${note.length} → ${text.length} Zeichen, ${after.length} Absätze`)
})

/** Replaces a term wherever a note uses it, and says how often. */
const replaceTerm = (node: unknown, before: string, after: string): number => {
    if (Array.isArray(node)) return node.reduce((sum, item) => sum + replaceTerm(item, before, after), 0)
    if (node === null || typeof node !== 'object') return 0

    return Object.entries(node as Json).reduce((sum, [key, value]) => {
        if (key !== 'note' || typeof value !== 'string' || !value.includes(before)) {
            return sum + replaceTerm(value, before, after)
        }
        (node as Json)[key] = value.replaceAll(before, after)
        return sum + value.split(before).length - 1
    }, 0)
}

TERMS.forEach(({ before, after, times }) => {
    const count = replaceTerm(document, before, after)
    if (count === 0) return report.push(`„${before}“ steht nicht mehr da, schon ersetzt`)
    if (count !== times) problems.push(`„${before}“ steht ${count}-mal da, erwartet waren ${times}`)
    report.push(`„${before}“ → „${after}“: ${count} Stellen`)
})

finish(document, report, [...problems, ...structuralProblems(document)])
