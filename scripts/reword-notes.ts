/**
 * Settles the wording of the edition's notes.
 *
 * `TERMS` is the vocabulary as it has been decided: each phrase with what
 * it becomes and how often it is expected, so that a re-run both applies
 * what is new and reports if a settled term has crept back. `REWORDINGS`
 * rewrites a whole note, checking how it begins and refusing to drop a
 * number or a reference. It is emptied again after every write, since a
 * rewording left standing is replayed and puts back wording that TERMS
 * has settled since. To write one, bring back the `refer`/`at` helpers
 * from the history and name the punchings with `scripts/probe-ids.ts`.
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
    /** Ids the new note stops pointing at on purpose: a link dropped, or one that was wrong. */
    mayUnlink?: readonly string[]
}

const REWORDINGS: readonly Rewording[] = [
    // Empty on purpose, and emptied again after every write. A rewording
    // holds the note's whole text, so one left here is replayed on the
    // next run and puts back the wording that TERMS has since settled.
    // The history holds what was done; this list holds what is still to do.
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
    { before: "Schmitz'", after: 'Schmitz’', times: 1 },
// Das gestanzte Loch hieß sechsfach. Jetzt: Stanzung für das, was
    // gestanzt wurde, Loch für das, was am Papier gemessen wird,
    // Perforation nur, wo eine fremde Quelle so spricht.
    { before: 'händische Perforierungen', after: 'händische Stanzungen', times: 1 },
    { before: 'Die Öffnung misst auf St1', after: 'Das Loch misst auf St1', times: 1 },
    { before: 'den Crescendo-Öffnungen', after: 'den Crescendo-Löchern', times: 1 },
    { before: 'Die Öffnung ist 0,19 Zoll breit', after: 'Das Loch ist 0,19 Zoll breit', times: 1 },
    { before: 'Haltende Perforation', after: 'Haltende Stanzung', times: 1 },
    { before: 'keine Perforation lang genug', after: 'keine Stanzung lang genug', times: 1 },
    { before: 'jede andere Perforation dieser Rolle misst', after: 'jedes andere Loch dieser Rolle misst', times: 1 },
    { before: 'eine 499 mm lange Perforation', after: 'ein 499 mm langes Loch', times: 1 },
    { before: 'Die Ausdrucksperforationen fehlen', after: 'Die Ausdrucksstanzungen fehlen', times: 1 },
    { before: 'als die Perforation lang ist', after: 'als die Stanzung lang ist', times: 1 },
    { before: 'Rückspulperforation', after: 'Rückspulstanzung', times: 3 },

    // Hinzufügen und Tilgen hießen je drei bis vier Wörter.
    { before: 'Eine spätere Einfügung', after: 'Eine spätere Hinzufügung', times: 1 },
    { before: 'eine spätere Einfügung', after: 'eine spätere Hinzufügung', times: 1 },
    { before: 'Wäre es eine Zutat von', after: 'Wäre es eine Hinzufügung von', times: 1 },
    { before: 'machte diese Zutat eine', after: 'machte diese eine', times: 1 },
    { before: 'als Zusatz dieser Fassung', after: 'als Hinzufügung dieser Fassung', times: 1 },
    { before: 'sieben Entfernungen', after: 'sieben Tilgungen', times: 1 },
    { before: 'für die Entfernungen', after: 'für die Tilgungen', times: 1 },

    // Kleinere Dubletten und Prägungen.
    { before: 'der Ziehungen', after: 'der Stichproben', times: 1 },
    { before: 'Keine Kopie zeigt', after: 'Kein Exemplar zeigt', times: 1 },
    { before: 'nimmt den Aufwickelzug auf', after: 'nimmt den wachsenden Durchmesser der Aufwickelrolle auf', times: 1 },
    { before: 'Ventile eines Sperr-und-Lösch-Paares', after: 'Ventile von Mezzoforte-Aus und Mezzoforte-Ein', times: 1 },
    { before: 'gepoolter z-Wert', after: 'zusammengefasster z-Wert', times: 2 },
    { before: 'Spaltenzählung des Parsers', after: 'Spaltenzählung von tiff2holes', times: 1 },
    { before: 'sieben Einheiten', after: 'sieben Stellen', times: 1 },
    { before: 'vier Einheiten', after: 'vier Stellen', times: 1 },

    // Eine Schreibung für die Systeme.
    { before: 'Blockskala T 98', after: 'Blockskala T-98', times: 1 },
    { before: 'linierte T100-Rolle', after: 'linierte T-100-Rolle', times: 1 },

    // Dieselbe Größe stand mit zwei Werten da; 203,6 ist der erschlossene.
    { before: '203 dpi quer', after: '203,6 dpi quer', times: 1 },

    // Die Sigle bei der Erstnennung, damit Prosa und Stemma zusammenfinden.
    { before: 'Trachtmans Lesung von Gourlins Exemplar dieser Fassung',
      after: 'Trachtmans Lesung von Gourlins Exemplar (Go1) dieser Fassung', times: 1 },
    { before: 'Trachtmans Emulation von Gourlins Exemplar',
      after: 'Trachtmans Emulation von Gourlins Exemplar (Go1)', times: 1 },
    { before: 'die Aufnahme von Schmitz’ Exemplar', after: 'die Aufnahme von Schmitz’ Exemplar (Sc1)', times: 1 },

    // Dasselbe Exemplar trug zwei Tempoangaben, ohne dass eine Notiz es sagte.
    { before: 'Chases Exemplar von {{e07c4be8-f44b-496d-8a6c-026006340441}} dagegen 80.',
      after: 'Chases Exemplar (Ch1) von {{e07c4be8-f44b-496d-8a6c-026006340441}} dagegen 80 (so der Scankopf; W225E.ann nennt 83).', times: 1 },

    // Eine Form für dieselbe Zeitschrift.
    { before: 'Rex Lawson, Pianola Journal 20 (2009), S. 26',
      after: 'Rex Lawson, The Pianola Journal 20 (2009), S. 26', times: 1 },
    { before: '(„On the Right Track“, The Pianola Journal 20, 2009, S. 37)',
      after: '(„On the Right Track“, The Pianola Journal 20 (2009), S. 37)', times: 1 },

    { before: '361 Perforationen, die zum Scanner gehören', after: '361 Löcher, die zum Scanner gehören', times: 1 },
    { before: 'beim Durchlauf ihrer Perforation', after: 'beim Durchlauf ihrer Stanzung', times: 1 },

    // Ein Exemplar ist überliefert, nicht bekannt, und es ist in einer Quelle, nicht aus ihr.
    { before: 'Bekannt allein aus der Einspielung von', after: 'Überliefert allein in der Einspielung von', times: 1 },
    { before: 'Bekannt allein aus der Einspielung in', after: 'Überliefert allein in der Einspielung in', times: 1 },
    // „in der Einspielung in Legendary Masters“ doppelt die Präposition; auf einer Platte steht die Einspielung.
    { before: 'in der Einspielung in Legendary Masters', after: 'in der Einspielung auf Legendary Masters', times: 1 }
]

/** Every number a note gives, which a rewording has to carry over. */
const figuresIn = (note: string): string[] => note.replace(/\{\{[^}]+\}\}/g, ' ').match(/\d+(?:[,.]\d+)?/g) ?? []

/**
 * What a note refers to, by id alone: a rewording may well put other
 * words in a reference's place, but dropping the reference itself would
 * cost the reader a link.
 */
const referencesIn = (note: string): string[] =>
    [...new Set([...note.matchAll(/\{\{\s*([^{}|\s]+)/g)].map(match => match[1]!))]

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

REWORDINGS.forEach(({ path, startsWith, after, mayDrop = [], mayUnlink = [] }) => {
    const reason = noteAt(document, path)
    const note: string | undefined = reason?.note
    const text = after.join('\n\n')

    if (!reason || note === undefined) return problems.push(`${path} trägt keine Notiz`)
    if (asRead(note) === asRead(text)) return report.push(`${path} ist schon umformuliert`)
    if (!note.startsWith(startsWith)) return problems.push(`${path} beginnt nicht wie erwartet`)

    const lost = figuresIn(note).filter(figure => !figuresIn(text).includes(figure) && !mayDrop.includes(figure))
    if (lost.length > 0) return problems.push(`${path} verlöre die Zahlen ${lost.join(', ')}`)

    const unlinked = referencesIn(note)
        .filter(reference => !text.includes(reference) && !mayUnlink.some(id => reference.includes(id)))
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
