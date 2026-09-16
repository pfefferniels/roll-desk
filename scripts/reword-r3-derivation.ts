/**
 * Rewords the argument for R3 so that its steps stand apart.
 *
 * The paragraph ran the case for a shared source and the case against
 * descent from R4 together in one block, and it called the seven shared
 * punchings "Hinzufügungen von R4" although its conclusion takes them
 * away from R4 and gives them to R3. Read from the front it therefore
 * argued that L1 stands below R4, which is what it means to rule out.
 *
 * Nothing in the evidence changes: the same measurements, the same
 * counts, the same conclusion.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/reword-r3-derivation.ts [--write]
 */

import { finish, Json, readEdition, structuralProblems } from './storedEdition'

const R3 = 'bab25aef-f80d-4ff0-b187-63030df8305a'
const R2 = '19fd4209-81cc-4d03-b2c3-fc7518dbba14'

const refer = (id: string) => `{{${id}}}`
const L1 = refer('2767844e-311e-4b97-8fb2-1b78db41e220')
const R4 = refer('c9050e75-97a8-4862-9533-0f4b1439802b')

const BEFORE = `${refer(R3)} ist durch kein Exemplar überliefert. Die Licensee-Fassung ${L1} trägt sieben Hinzufügungen von ${R4} an der Stelle, an der ${R4} sie hat,`

const AFTER = [
    `${refer(R3)} ist durch kein Exemplar überliefert und aus dem Verhältnis von ${R4} und ${L1} erschlossen.`,

    `Sieben Hinzufügungen, die bisher ${R4} allein zuzuschreiben waren, trägt ${L1} an genau deren Stelle, innerhalb von 3,3 mm und damit so genau wie die gemeinsamen Stanzungen: die Forzandi im Bass bei 2365 und 4281 mm und das Crescendo im Diskant bei 5159 mm mit beiden Stanzungen, die Crescendi im Diskant bei 4816, 5037, 6663 und 7832 mm mit einer. Das Crescendo im Bass bei 2464 mm liegt 3,8 mm davor und gehört wohl ebenfalls hierher, denn zwei unabhängige Paare so nah beieinander sind unwahrscheinlich.`,

    `Die gleiche Stanzung an gleicher Stelle wird kaum zweimal unabhängig gesetzt. Läge ${L1} unter ${R4}, wäre das erklärt. Dagegen stehen die übrigen 118 Stanzungen von ${R4}, von denen ${L1} keine trägt, darunter keines der 23 Paare, die die Mittelstimmen differenzieren. Auch die Bereinigungen und die Verschiebung des c′ in T. 4 fehlen ihr. Wer von ${R4} ausginge, hätte das alles zurücknehmen müssen.`,

    `Die sieben standen also schon vor beiden. ${R4} und ${L1} gehen auf eine gemeinsame Vorlage nach ${refer(R2)} zurück, und das ist ${refer(R3)}. Die sieben gehören ihr, die 118 übrigen erst ${R4}.`,

    `Dazu stimmt das Forzando ab bei 4287 mm: es macht das An von ${refer(R2)} bei 4334 mm wirksam, das nach dem offenen An bei 4050 mm ohne Wirkung war. Eine Einfügung, die eine Redundanz wirksam macht, ist sonst nicht anzunehmen und liest sich hier als Korrektur.`
].join('\n\n')

/** The measurements and counts the argument rests on, which the rewording must carry over unchanged. */
const EVIDENCE = ['2365', '4281', '5159', '4816', '5037', '6663', '7832', '2464', '3,3 mm', '3,8 mm', '118', '23 Paare', '4287', '4334', '4050']

const document = readEdition()
const problems: string[] = []
const report: string[] = []

const version: Json | undefined = document.versions.find((candidate: Json) => candidate['@id'] === R3)
const derivation: Json | undefined = (version?.basedOn ?? []).find((based: Json) => based['@id'] === R2)
const reason: Json | undefined = derivation?.['@annotation']?.belief?.reasons?.[0]

if (!reason) {
    problems.push('die Ableitung von R3 aus R2 trägt keine Begründung mehr')
} else if (reason.note === AFTER) {
    console.log('  Die Begründung ist schon umformuliert')
    process.exit(0)
} else if (!reason.note.startsWith(BEFORE)) {
    problems.push('die Begründung lautet nicht mehr so, wie sie hier erwartet wird')
} else {
    const missing = EVIDENCE.filter(fact => !AFTER.includes(fact))
    if (missing.length > 0) problems.push(`der neue Text nennt nicht mehr: ${missing.join(', ')}`)

    reason.note = AFTER
    report.push(`Begründung von R3 neu gefasst, ${AFTER.split('\n\n').length} Absätze, ${AFTER.length} Zeichen`)
    report.push(`alle ${EVIDENCE.length} Messwerte und Zählungen stehen weiterhin darin`)
}

finish(document, report, [...problems, ...structuralProblems(document)])
