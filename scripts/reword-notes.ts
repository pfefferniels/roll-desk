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

const refer = (id: string, label?: string) => `{{${id}${label ? `|${label}` : ''}}}`

const R1 = refer('0e5f443d-0dd9-4810-9dbe-7f5007df490f')
const R2 = refer('19fd4209-81cc-4d03-b2c3-fc7518dbba14')
const R3 = refer('bab25aef-f80d-4ff0-b187-63030df8305a')
const L1 = refer('2767844e-311e-4b97-8fb2-1b78db41e220')
const R4 = refer('c9050e75-97a8-4862-9533-0f4b1439802b')

/** A punching named in words, with the link carrying where it lies. */
const at = (id: string, words: string) => refer(`symbol_${id}`, words)

/**
 * The millimetre figures leave the prose. A note names the punching it
 * means and the reference holds the place, so that a figure written once
 * can neither go stale nor contradict the same punching named elsewhere,
 * as 5370,8 and 5370,9 did.
 *
 * Three notes are left alone: in them the figures are a list of places
 * rather than the name of one, and half of the places named have no link
 * yet, so dropping them would take away what a reader needs to find them.
 */
const REWORDINGS: readonly Rewording[] = [
    {
        path: 'versions/0/edits/9/@annotation/belief/reasons/0',
        startsWith: 'Das zweite An bei ',
        after: [
            `Das ${at('058f3b2f-6f66-4754-9e71-b4c858187e1f', 'zweite An')} des Crescendos im Bass trägt allein St1; es steht zwischen dem ${at('9d2ed841-8f5e-4c58-bfbb-258d930302f4', 'An')} und dem ${at('9618ebdc-40ae-4469-8fcf-473ee6d2965b', 'Ab')} und ist dort wirkungslos. Ein An nach einem An ist die Spur einer Verlegung: das An stand zuerst an der ${at('058f3b2f-6f66-4754-9e71-b4c858187e1f', 'späteren')} Stelle und wurde auf die ${at('9d2ed841-8f5e-4c58-bfbb-258d930302f4', 'frühere')} vorgezogen, die alte Stanzung blieb stehen; ${R3} tilgt sie. Die Öffnung misst auf St1 7,2 mm gegen im Median 5,1 mm bei den Crescendo-Öffnungen im Bass, was eine eigene Stanzung dieses Exemplars nicht ausschließt.`
        ],
        mayDrop: ['7364,7', '7396', '7348']
    },
    {
        path: 'versions/0/edits/17/@annotation/belief/reasons/0',
        startsWith: 'Das An des Una Corda-Pedals bei ',
        after: [
            `Das ${at('ff2b533b-cc1f-4783-a224-31c24eee0900', 'An des Una Corda-Pedals')} trägt allein Wi1. Ohne es stünde schon in ${R1} das ${at('05dbd89d-9db1-42fb-a745-59913ee4ed9b', 'zweite Ab')} ohne Wirkung, wie St1 und St2 es tragen. Eine spätere Einfügung, die eine bestehende Redundanz nachträglich erklärt, ist unwahrscheinlich. Also steht das An in ${R1}; ${R2} hat es getilgt und das Ab stehen lassen.`
        ],
        mayDrop: ['6250,4', '6338,5']
    },
    {
        path: 'versions/4/edits/7/@annotation/belief/reasons/0',
        startsWith: 'Das Loslassen bei ',
        after: [
            `Das ${at('321fbdb3-85db-4c44-8f72-0019d9c619b3', 'Loslassen des Dämpferpedals')} fehlt allein auf Wi1; es steht auf St1, St2, Ch1 und Ph1, und Bo1 hält das Pedal genau bis dorthin. Wäre es eine Zutat von ${R2}, machte diese Zutat eine in ${R1} bereits stehende Redundanz sinnvoll, was Bearbeitungen nicht tun. Also steht es in ${R1}, und dieses Exemplar hat es verloren.`
        ],
        mayDrop: ['5370,8']
    },
    {
        path: 'copies/5/carries/0/@annotation/belief/reasons/0',
        startsWith: 'Lautstärke der gehörten Töne folgt der Dynamik von ',
        after: [
            `Lautstärke der gehörten Töne folgt der Dynamik von {{c9050e75-97a8-4862-9533-0f4b1439802b}} besser als der von ${R1}, {{755d411a-0ba4-4f59-90a7-f231be3e66ad}} und ${R2}: Anschlagstärken von Transkun allein R² 0,65 gegen 0,61 bei ${R2}; von Kong allein 0,55 gegen 0,49; ebenso auf dem Mittel der vier Lautstärkemaße unter allen sieben Einstellungen des Emulators.`,

            `Die Lesarten, die ${R2} und {{c9050e75-97a8-4862-9533-0f4b1439802b}} zu ${R1} hinzufügen, vorhanden (A-posteriori-Wahrscheinlichkeit 1,00 auf dem Mittel der vier Maße).`,

            `Zuordnung der Töne allein über ihr Timing, das in allen roten Fassungen gleich ist; gegen ${R1} oder ${R2} ausgerichtet dieselbe Paarung.`,

            `Von 33 Passagen, deren Lesarten die Lautstärke genug ändern, um sie zu beurteilen, weicht eine von {{c9050e75-97a8-4862-9533-0f4b1439802b}} ab: das ${at('134b68f6-7af4-4b57-907d-b613a103db29', 'Crescendo im Bass')} von ${R2} (p = 0,013), im Rahmen des Zufalls.`,

            `Die Prämissen schließen ein Instrument unbekannter Regulierung ein; daher nicht höher als wahrscheinlich gehalten.`
        ],
        mayDrop: ['3360,8']
    },
    {
        path: 'versions/4/basedOn/0/@annotation/belief/reasons/0',
        startsWith: '{{755d411a-0ba4-4f59-90a7-f231be3e66ad}}: nur in Wi1',
        after: [
            `{{755d411a-0ba4-4f59-90a7-f231be3e66ad}}: nur in Wi1, ohne Antwort auf anderem Ast – allmähliches Aufheben der Verschiebung T. 9; Rückspulstanzung; fünf Crescendo-/Forzando-Befehle T. 2, 6, 7; zwei Tilgungen (${at('b145db1a-a9d1-43db-bed6-d3fd7e24575b', 'Ab des Diskant-Crescendos')}; ${at('321fbdb3-85db-4c44-8f72-0019d9c619b3', 'Ab des Dämpferpedals')}).`,

            `45 weitere Lesarten nur in Wi1, doch schon in ${R1}: meist ${R2} nahebei gleichartig, also verlegt; sonst Auflösung einer Redundanz von ${R1}, die eine spätere Einfügung nicht nachträglich erklärte.`
        ],
        mayDrop: ['1708,6', '5370,9']
    },
    ...['453db0e0-ee3d-457a-876f-ed6d82af162d', '094529d8-ffa4-4398-b18a-e4b9a3e6881e',
        '24440ecd-f24a-4d6f-9c39-79438a3d4b43', 'baf595b7-4ca6-4610-99f8-6fb7cee39ae5']
        .map((symbol, index) => ({
            path: `versions/8/edits/${[5, 22, 35, 48][index]}/@annotation/belief/reasons/0`,
            startsWith: 'Stanzung an der Stelle von ',
            after: [
                `Eine ${at(symbol, 'Stanzung')} an der Stelle von ${R1}, überliefert allein in Wi1, dort wo ${R2} sie verlegt oder getilgt hat. Eine von vier solchen Stellen: entweder eigene Lesart von ${L1}, die die Stelle von ${R1} wieder trifft, oder Bewahrung gegen ${R2}, was sich mit der Ableitung über ${R3} nur unter Kontamination verträgt. Zur Abwägung siehe die Ableitung von ${L1}.`
            ],
            mayDrop: ['1986,7', '2872,9', '4055,7', '5582,7']
        })),
    {
        path: 'copies/7/carries/0/@annotation/belief/reasons/0',
        startsWith: 'Töne und Dämpferpedal stimmen mit Phillips’ Lesung überein',
        after: [
            `Töne und Dämpferpedal stimmen mit Phillips’ Lesung überein; abweichend allein ein cis′′ in T. 14 (Lücke von 3 mm, vermutlich eine fehlende Stanzung dieses Exemplars) und ein doppeltes ${at('1d1ecad2-6934-4afa-8204-e7a36fe30ed9', 'Ab des Pedals')}.`,

            `Anschlagstärken folgen der Dynamik von Phillips’ Stanzungen, geprüft in deren Kodierung. Wo das Verfahren unterscheiden kann: Hinzufügungen von {{c9050e75-97a8-4862-9533-0f4b1439802b}}, die ${L1} trägt, vorhanden (sieben Einheiten, gepoolter z-Wert +1,15 ± 0,23); Stanzungen von ${R2}, die ${L1} tilgt, fehlen (vier Einheiten, −1,26 ± 0,10); Differenzierung der Mittelstimmen fehlt (−1,00 ± 0,18).`,

            `Auf Phillips’ eigener Standard-MIDI-Datei gibt dasselbe Verfahren wieder, was seine Stanzungen zeigen, außer vor dem ersten Ton; das Crescendo-Paar vor dem Auftakt ist daher allein durch Phillips’ Lesung bezeugt.`,

            `Eine Änderung durch das Una Corda-Pedal zeigen die Anschlagstärken in T. 8′ bis 15 nicht.`
        ],
        mayDrop: ['4468']
    },
    {
        // Only the last paragraph changes: the second lists seven places,
        // four of which have no link yet, so its figures have to stay.
        path: 'versions/1/basedOn/0/@annotation/belief/reasons/0',
        startsWith: `${R3}: durch kein Exemplar überliefert`,
        after: [
            `${R3}: durch kein Exemplar überliefert, erschlossen aus dem Verhältnis von ${R4} und ${L1}.`,

            `Sieben Hinzufügungen, bisher ${R4} allein zugeschrieben, in ${L1} an genau deren Stelle, innerhalb von 3,3 mm und damit so genau wie die gemeinsamen Stanzungen: Forzandi im Bass 2365 und ${at('9ecc1747-1258-4e70-be6f-971ceee0f964', '4281 mm')}, Crescendo im Diskant ${at('36fa67a1-2d4c-46e5-b1b0-852c8933c898', '5159 mm')}, je mit beiden Stanzungen; Crescendi im Diskant 4816, 5037, 6663 und 7832 mm mit einer. Das Crescendo im Bass ${at('7c9e1156-ad28-412a-ab0c-400137b2f6b0', '2464 mm')} liegt 3,8 mm davor, knapp außerhalb, gehört aber wohl hierher: zwei unabhängige Paare so nah beieinander sind unwahrscheinlich.`,

            `Gleiche Stanzung an gleicher Stelle kaum zweimal unabhängig. ${L1} unter ${R4} erklärte das; dagegen stehen die übrigen 118 Stanzungen von ${R4}, von denen ${L1} keine trägt, darunter keines der 23 Paare der Mittelstimmen-Differenzierung, dazu die Bereinigungen und die Verlegung des c′ in T. 4. Wer von ${R4} ausginge, hätte das alles zurücknehmen müssen.`,

            `Also standen die sieben vor beiden: ${R4} und ${L1} gehen auf eine gemeinsame Vorlage nach ${R2} zurück, und das ist ${R3}. Ihr gehören die sieben, ${R4} erst die 118 übrigen.`,

            `Dazu das ${at('23e43b39-886f-4b6c-8827-127a70774470', 'Forzando ab')}: es macht das ${at('92c575eb-5767-4cf8-9d74-2f5de03dfcbc', 'An')} von ${R2} wirksam, das nach dem ${at('f9292c10-fe39-46d9-9169-a237822d8176', 'offenen An')} ohne Wirkung war. Eine Einfügung, die eine Redundanz wirksam macht, ist sonst nicht anzunehmen; hier liest sie sich als Korrektur.`
        ],
        mayDrop: ['4287', '4334', '4050']
    }
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
