/**
 * Takes the four readings of R1 in L1 for what the edition's own rules
 * suggest: readings of a second model in R1's state, not the Licensee
 * editor's own. The contamination is stated as possible, not as likely,
 * and its belief names what speaks against it.
 *
 * At four of the places where R2 moves or strikes a punch of R1, L1 has
 * R1's punch. The derivation of L1 and the four edits allowed that L1 set
 * them again by chance, since random punches of the reading hit such
 * places 0.7 times on average and up to seven times. The rules say
 * otherwise. The same punch at the same place is hardly set twice
 * independently, which is the rule R3 rests on, and the editor of L1
 * could not know that it had stood there. No insertion makes a redundancy
 * effective, and the On at 2873 mm would do that to the Off that R2 leaves
 * standing at 2893 mm. L1 descends from R2 all the same, so a second
 * model in R1's state is the simplest account.
 *
 * It is not the only one. Chance remains. So does a lost state between R1
 * and R2 holding R2's new punches beside R1's old ones, from which R2 and
 * R3 would descend; but then R2 and R4 would each have struck the old
 * ones, and at 1964 and 2873 mm these are sounding accents, not
 * redundancies. Performed on the T-100, their loss makes the following
 * six and seven notes up to 7.8 steps of velocity softer.
 *
 * States the derivation from R1 beside the principal one, gives the four
 * edits a motivation of their own and rewrites their notes and the
 * objection in the derivation from R3. The text of every version stays as
 * it is.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/take-r1-readings-into-l1.ts [--write]
 */

import { finish, Json, principalOf, readEdition, structuralProblems, textOf, believing, argued } from './storedEdition'

const R1 = '0e5f443d-0dd9-4810-9dbe-7f5007df490f'
const R2 = '19fd4209-81cc-4d03-b2c3-fc7518dbba14'
const R3 = 'bab25aef-f80d-4ff0-b187-63030df8305a'
const R4 = 'c9050e75-97a8-4862-9533-0f4b1439802b'
const L1 = '2767844e-311e-4b97-8fb2-1b78db41e220'

const refer = (id: string) => `{{${id}}}`

/** The four edits of L1 that put a punch of R1 back where R2 moved or struck it. */
const RETAINED = [
    'de7cad42-2f6b-4901-b3c5-19643a72cd97', // the treble crescendo at 1964 and 1987 mm, which R2 moves forward
    '3264624a-fc41-4420-9462-178606fa9a6f', // the treble On at 2873 mm, which R2 strikes
    '9d851d74-0a08-44a6-bba5-32a9d953d8b2', // the bass Off at 4056 mm, which R2 moves to 4047 mm
    '31799464-d1ec-4390-ad87-2dd3d564ca0a' // the bass On at 5583 mm, which R2 moves to 5563 mm
]

/** The edit whose On would, as L1's own insertion, make the Off at 2893 mm effective again. */
const REVIVING = '3264624a-fc41-4420-9462-178606fa9a6f'
const OFF_LEFT_STANDING = 'symbol_aedcbbdf-580a-43f7-8e3d-73475aa3ce6a'

const MOTIVATION = {
    note: 'Eine Stanzung der Mutterrolle, die eine spätere Revision verlegt oder getilgt hat, vermutlich aus einer zweiten Vorlage übernommen',
    '@type': 'motivation',
    '@id': 'taken-from-mother-roll'
}

/** How the four notes went on after naming the punching, which the rewording replaces. */
const EDIT_BEFORE = `Eine von vier solchen Stellen: entweder eigene Lesart von ${refer(L1)}, die die Stelle von ${refer(R1)} wieder trifft, oder Bewahrung gegen ${refer(R2)}, was sich mit der Ableitung über ${refer(R3)} nur unter Kontamination verträgt. Zur Abwägung siehe die Ableitung von ${refer(L1)}.`

const EDIT_AFTER = `Eine von vier solchen Stellen, wohl nicht neu gesetzt, sondern aus einer zweiten Vorlage im Stand von ${refer(R1)} übernommen; wie unsicher das ist, steht bei der Ableitung von ${refer(L1)} aus ${refer(R1)}.`

const REVIVAL = `Als eigene Einfügung machte sie das {{${OFF_LEFT_STANDING}|Ab}} wieder wirksam, das ${refer(R2)} mit der Tilgung wirkungslos stehen ließ.`

const OBJECTION_BEFORE = `Dagegen: an vier der 45 Stellen, an denen ${refer(R2)} eine Stanzung von ${refer(R1)} verlegt oder tilgt, trägt sie die von ${refer(R1)}. Doch treffen zufällig gelegte Stanzungen dieser Lesung solche Stellen im Mittel 0,7-mal und bis zu siebenmal, während die Hinzufügungen, die ${refer(R3)} begründen, weit über dem Zufall liegen.`

const OBJECTION_AFTER = `Nicht aus dieser Vorlage: an vier der 45 Stellen, an denen ${refer(R2)} eine Stanzung von ${refer(R1)} verlegt oder tilgt, trägt sie die von ${refer(R1)}. Sie kommen vermutlich aus einer zweiten Vorlage; siehe die Ableitung aus ${refer(R1)}.`

const CONTAMINATION = [
    `An vier der 45 Stellen, an denen ${refer(R2)} eine Stanzung von ${refer(R1)} verlegt oder tilgt, trägt ${refer(L1)} die von ${refer(R1)}, innerhalb von 3,3 mm: das Ab des Diskant-Crescendos bei 1987 mm, das ${refer(R2)} mit seinem An auf 1931 und 1950 mm vorzieht (${refer(L1)} hat beide Betonungen), das An im Diskant bei 2873 mm, das ${refer(R2)} tilgt, das Ab im Bass bei 4056 mm und das An im Bass bei 5583 mm, die ${refer(R2)} auf 4047 und 5563 mm verlegt. Alle vier liegen in Passagen, die ${refer(L1)} auch sonst überarbeitet.`,

    `Die gleiche Stanzung an gleicher Stelle wird kaum zweimal unabhängig gesetzt, und in einer Vorlage im Stand von ${refer(R3)} stand sie nicht mehr. Das An bei 2873 mm machte als eigene Einfügung zudem das Ab bei 2893 mm wieder wirksam, das ${refer(R2)} mit der Tilgung wirkungslos stehen ließ; eine Einfügung, die eine Redundanz wirksam macht, ist nicht anzunehmen. ${refer(L1)} steht dennoch unter ${refer(R2)}, wie die Ableitung aus ${refer(R3)} zeigt, und folgt an 20 der 25 Stellen, an denen ${refer(R2)} einen Fehler berichtigt, dessen Berichtigung. Am einfachsten erklärt das eine zweite Vorlage im Stand von ${refer(R1)}, eine Kontamination. Welche Kopie es gewesen sein könnte, ist nicht bekannt.`,

    `Gewiss ist das nicht, und es geht gegen die Annahme, dass Kontamination in der Überlieferung der Rollen keine Rolle spielt. Zwei Erklärungen ohne Kontamination bleiben möglich, jede um den Preis eines Zufalls. Der Bearbeiter von ${refer(L1)} kann die vier Stanzungen neu gesetzt haben: zufällig gelegte Stanzungen dieser Lesung treffen solche Stellen im Mittel 0,7-mal, viermal also selten, aber nicht nie. Oder ${refer(R2)} und ${refer(R3)} gehen auf einen verlorenen Stand zurück, in dem die neuen Stanzungen von ${refer(R2)} schon neben den alten stehen; das erklärte, dass ${refer(L1)} bei 1987 mm beide Betonungen trägt. Dann hätten ${refer(R2)} und ${refer(R4)} die alten je für sich getilgt. Bei 4056 und 5583 mm wären das Redundanzen, deren Tilgung in zwei Ästen unabhängig geschehen kann. Die Betonungen bei 1964 und 2873 mm aber sind wirksam: ohne sie klingen in der Emulation auf dem T-100 die folgenden sechs und sieben Töne um bis zu 7,8 von 127 Stufen der Anschlagstärke leiser. Beide Äste hätten also dieselben zwei klingenden Betonungen zurücknehmen müssen.`
].join('\n\n')

/** The measurements and counts the argument rests on, which the notes must carry. */
const EVIDENCE = ['45', '3,3 mm', '1987', '1931', '1950', '2873', '2893', '4056', '4047', '5583', '5563', '0,7', '20 der 25', '1964', '7,8 von 127']

const document = readEdition()
const problems: string[] = []
const report: string[] = []

const version: Json | undefined = document.versions.find((candidate: Json) => candidate['@id'] === L1)
if (!version) throw new Error('keine Version L1')

const principalBefore = principalOf(version)?.['@id']
const textsBefore = new Map<string, Set<string>>(document.versions.map((v: Json) => [v['@id'], textOf(document, v)]))

const missing = EVIDENCE.filter(fact => !`${CONTAMINATION}\n${OBJECTION_AFTER}`.includes(fact))
if (missing.length > 0) problems.push(`die Begründung nennt nicht mehr: ${missing.join(', ')}`)

// The derivation from R1, beside the one from R3 that the text is read against.
if ((version.basedOn ?? []).some((derivation: Json) => derivation['@id'] === R1)) {
    report.push('die Ableitung aus R1 steht schon')
} else {
    version.basedOn = [...version.basedOn, { '@annotation': believing('possible', [argued(CONTAMINATION)]), '@id': R1 }]
    report.push(`Ableitung aus R1 als mögliche Kontamination angesetzt, ${CONTAMINATION.split('\n\n').length} Absätze`)
}

// The objection in the derivation from R3, which now points to the derivation from R1.
const reason: Json | undefined = (version.basedOn ?? [])
    .find((derivation: Json) => derivation['@id'] === R3)?.['@annotation']?.belief?.reasons?.[0]
if (!reason) {
    problems.push('die Ableitung aus R3 trägt keine Begründung mehr')
} else if (reason.note.includes(OBJECTION_AFTER)) {
    report.push('der Einwand in der Ableitung aus R3 ist schon umformuliert')
} else if (!reason.note.includes(OBJECTION_BEFORE)) {
    problems.push('der Einwand in der Ableitung aus R3 lautet nicht mehr so, wie er hier erwartet wird')
} else {
    reason.note = reason.note.replace(OBJECTION_BEFORE, OBJECTION_AFTER)
    report.push('Einwand in der Ableitung aus R3 auf die Ableitung aus R1 verwiesen')
}

// The four edits: their own motivation, and notes that say where the punch came from.
if (!version.motivations.some((motivation: Json) => motivation['@id'] === MOTIVATION['@id'])) {
    version.motivations = [...version.motivations, MOTIVATION]
}
for (const id of RETAINED) {
    const edit: Json | undefined = version.edits.find((candidate: Json) => candidate['@id'] === id)
    const note: Json | undefined = edit?.['@annotation']?.belief?.reasons?.[0]
    if (!edit || !note) {
        problems.push(`die Bearbeitung ${id} fehlt oder trägt keine Begründung`)
        continue
    }
    const after = id === REVIVING ? `${EDIT_AFTER} ${REVIVAL}` : EDIT_AFTER
    if (note.note.endsWith(after)) {
        report.push(`Bearbeitung ${id.slice(0, 8)} schon umformuliert`)
    } else if (!note.note.endsWith(EDIT_BEFORE)) {
        problems.push(`die Begründung der Bearbeitung ${id} lautet nicht mehr so, wie sie hier erwartet wird`)
    } else {
        note.note = note.note.slice(0, -EDIT_BEFORE.length) + after
        const was = edit.motivation
        // Where the stored edits name their motivation: after the type, or first where they have none.
        const rest = Object.fromEntries(Object.entries(edit).filter(([key]) => key !== 'editType' && key !== 'motivation'))
        const reordered = { ...(edit.editType && { editType: edit.editType }), motivation: MOTIVATION['@id'], ...rest }
        version.edits[version.edits.indexOf(edit)] = reordered
        report.push(`Bearbeitung ${id.slice(0, 8)} aus R1 übernommen${was ? ` (statt ${was})` : ''}`)
    }
}

// What must not move: the version L1's text is read against, and the text of any version.
if (principalOf(version)?.['@id'] !== principalBefore) problems.push('L1 wird nicht mehr gegen R3 gelesen')
const changed = document.versions
    .filter((v: Json) => {
        const was = textsBefore.get(v['@id']) ?? new Set<string>()
        const is = textOf(document, v)
        return was.size !== is.size || [...was].some(id => !is.has(id))
    })
    .map((v: Json) => v['@id'])
if (changed.length > 0) problems.push(`der Text hat sich geändert in ${changed.join(', ')}`)

finish(document, report, [...problems, ...structuralProblems(document)])
