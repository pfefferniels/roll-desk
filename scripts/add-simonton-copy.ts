/**
 * Adds the copy of WM 225 known only from the recording Walter S. Heebner
 * produced for Richard C. Simonton in Los Angeles in the winter of 1962/63,
 * issued in The Classics Record Library's Legendary Masters of the Piano.
 *
 * The loudness of the recorded notes follows the dynamics A emulates and
 * lacks B's revision, so the copy is stated to carry A, possibly A1, and
 * unlikely B. Every number in the statements is read from report_data.json
 * of the comparison archived in the welte225.org repository, and the script
 * refuses to write where that report no longer bears the statements out.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/add-simonton-copy.ts [--archive=<commit>] [--write]
 */

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import {
    adopted, believing, changedTexts, decimal, finish, inferred, inWords, Json, person, readEdition,
    structuralProblems, textsOf, versionBy
} from './storedEdition'

const args = process.argv.slice(2)
const ARCHIVE = args.find(arg => arg.startsWith('--archive='))?.slice('--archive='.length)
if (args.includes('--write') && !ARCHIVE) throw new Error('--write needs --archive=<commit> of welte225.org')

const RECORDING = 'https://www.youtube.com/watch?v=ma3FOR-eUQQ'
const REPORT = new URL('../../welte225.org/simonton-225/trans/report_data.json', import.meta.url)
const archived = (path: string) => `https://github.com/pfefferniels/welte225.org/blob/${ARCHIVE ?? 'COMMIT'}/simonton-225/${path}`

const document = readEdition()
if (document.copies.some((copy: Json) => copy.readFrom?.output === RECORDING)) {
    console.log('  Das Exemplar aus Simontons Aufnahme steht schon in der Edition, nichts zu tun')
    process.exit(0)
}
const textsBefore = textsOf(document)
const report: Json = JSON.parse(readFileSync(REPORT, 'utf-8'))

const a = versionBy(document, 'A')
const a1 = versionBy(document, 'A1')
const b = versionBy(document, 'B')
const schmitz = document.copies.find((copy: Json) => copy.keeper?.name === 'Hans-W. Schmitz')
if (!schmitz) throw new Error('no copy of Schmitz to take the T-100 system from')

// ------------------------------------------------------------ the report

const r2 = (measure: string, siglum: string) => decimal(report.measures[measure].r2[siglum], 2)
const share = (x: number) => decimal(x, 2)
const entry = (entries: Json[], matches: (item: Json) => boolean, what: string): Json => {
    const found = entries.find(matches)
    if (!found) throw new Error(`the report has no ${what}`)
    return found
}
const againstA: Json[] = report.passages_against_A.transkun.by_family
const addedByB = entry(againstA, group => group.group === 'Badd', 'passages of B\'s additions')
const changedByB = entry(againstA, group => group.group === 'Bdel', 'passages where B changes A')
const softPedal: Json[] = report.pedals.soft.transkun
const flicker = entry(softPedal, comparison => comparison.other === 'A1', 'soft-pedal comparison with A1')
const unaCorda = entry(softPedal, comparison => comparison.other === 'B', 'soft-pedal comparison with B')
const composite: Json = report.hybrids.composite
const instruments: Json[] = Object.values(report.instruments)
const stretches: Json[] = Object.values(report.red_paper.timing.stretches)
const textTest: Json[] = report.red_paper.text_transkun
const departures: Json[] = [...report.departures_from_A.transkun, ...report.departures_from_A.composite_without_kong]
const ownCrescendi = (report.ablation.transkun.variants as Json[]).filter(v => v.variant.startsWith('A without its own SlowCrescendo'))
const largestStretch = Math.max(...stretches.map(stretch => Math.abs(stretch.extra_mm)))
const tied = textTest.find(reading => reading.kind === 'tied over')
const used = [archived('trans/report_data.json'), archived('trans/rec_composite.json'), archived('trans/matched_transkun.json'), archived('trans/matched.json')]

const problems = [
    ...(['A', 'A1'].includes(report.measures.transkun.best) && ['A', 'A1'].includes(report.measures.composite.best) ? [] : ['neither A nor A1 fits best']),
    ...(instruments.every(by => by.B > 0 && by.C > 0) ? [] : ['on some instrument setting B or C fits better than A']),
    ...(changedByB.favouring_toggle === 0 ? [] : ['a passage favours B where B moves or strikes a punch of A']),
    ...(ownCrescendi.length === 2 && ownCrescendi.every(v => v.delta > 0) ? [] : ['the recording does not answer A\'s own crescendi in both halves']),
    ...(departures.every(d => d.windows.length === 0) ? [] : ['a stretch departs from A']),
    ...(report.control_tacet.versions.best === 'C' ? [] : ['the control recording no longer comes out as C']),
    ...(textTest.every(reading => (reading.kind === 're-strike') === (reading.heard.length === 0)) ? [] : ['the note text does not follow the red copies']),
    ...(largestStretch < 1 ? [] : ['a Licensee stretch shows in the timing']),
]

// ----------------------------------------------------------- the copy

const copy: Json = {
    '@type': 'RollCopy',
    '@id': randomUUID(),
    ops: [],
    measurements: {},
    conditions: [],
    modifications: [],
    features: [],
    keeper: person('USC Libraries'),
    production: { system: schmitz.production.system },
    readFrom: {
        kind: 'recording',
        actor: person('Heebner, Walter S.'),
        output: RECORDING,
        instrument: {
            name: 'Steinway-Konzertflügel Nr. 261 mit dem Welte-Vorsetzer von Kenneth K. Caswell',
            sameAs: [],
            '@annotation': believing('likely', [adopted(
                'Die Plattentasche nennt den Steinway-Konzertflügel Nr. 261. Dass der Vorsetzer Kenneth K. Caswell gehörte und '
                + 'Caswell darin eine Ampico-Mechanik an die Stelle der Welte-Mechanik gesetzt hatte, berichtet Rex Lawson nach '
                + 'Caswells Erinnerung („On the Right Track“, The Pianola Journal 20, 2009, S. 37).')])
        },
        software: [
            { name: 'Transkun', version: '2.0.1, model 2.0' },
            { name: 'piano_transcription_inference', version: '0.0.6, checkpoint note_F1=0.9677_pedal_F1=0.9186' }
        ],
        note: 'Bekannt ist dieses Exemplar allein aus der Einspielung in Legendary Masters of the Piano (The Classics Record '
            + 'Library, 1963, Katalognummer WV 6633), LP 1, Seite 2, Nr. 2, hier nach der Überspielung, die David Hertzberg '
            + '2022 auf YouTube unter der Nummer SWV 6633 veröffentlicht hat. Nach der Abschrift der Plattentasche auf '
            + 'mmdigest.com wurde die Kassette von Richard C. Simonton für den Book-of-the-Month Club hergestellt, von Walter S. '
            + 'Heebner produziert und „in Los Angeles, California, winter 1962-1963, on Steinway Concert Grand No. 261“ '
            + 'aufgenommen. Simontons Welte-Rollen liegen heute in den USC Libraries. Deren Verzeichnis (2000) führt Nr. 0225 in '
            + 'drei Exemplaren, keines davon als Rolle der amerikanischen Tochtergesellschaft vermerkt. Welches von ihnen gespielt '
            + 'wurde, ist nicht bekannt. Töne und Timing folgen den roten Exemplaren: '
            + 'die Neuanschläge von D3 sind nicht zu hören, das e′′ '
            + `bei ${decimal(tied?.mm ?? 0)} mm, das D3 überbindet, erklingt, und an den beiden Stellen, an denen die Licensee-`
            + `Exemplare rund 27 mm länger laufen, weicht die Aufnahme um höchstens ${decimal(largestStretch)} mm ab, bei einer `
            + `Streuung aller gleich langen Strecken von ${decimal(report.red_paper.timing.control.sd_mm)} mm. Die Überspielung `
            + `klingt gleichbleibend ${decimal(report.audio.cents_sharp, 0)} Cent zu hoch, durch die Geschwindigkeit oder die `
            + 'Stimmung. Transkribiert wurde die Monosumme nach Korrektur der Tonhöhe, mit Transkun (Yan und Duan 2024) und dem '
            + 'Verfahren von Kong et al. (2021), dessen Transkription viele Fehltöne enthält und daher mit der Zeitzuordnung von '
            + 'Transkun gepaart ist. Die Lautstärke der Töne ist aus beiden Transkriptionen und aus einer NMF-Zerlegung nach Ewert '
            + `und Müller (2012) geschätzt. Transkriptionen und Auswertungen liegen unter ${archived('')}.`
    },
    carries: [{
        '@id': a['@id'],
        '@annotation': believing('likely', [inferred(
            'Die Lautstärke der gehörten Töne folgt der Dynamik, die A emuliert, besser als der von B, B2 oder C: mit den '
            + `Anschlagstärken von Transkun R² ${r2('transkun', 'A')} gegenüber ${r2('transkun', 'B')} bei B und `
            + `${r2('transkun', 'C')} bei C, mit denen von Kong ${r2('kong', 'A')} gegenüber ${r2('kong', 'C')}, und auf dem Mittel `
            + `von vier Lautstärkemaßen unter allen ${inWords(instruments.length)} Einstellungen des Emulators. Von den `
            + `${addedByB.detectable} Passagen mit Hinzufügungen von B, deren Lesarten die Lautstärke genug ändern, um sie zu `
            + `beurteilen, ${addedByB.favouring_toggle === 1 ? 'spricht eine' : `sprechen ${inWords(addedByB.favouring_toggle)}`} `
            + `für sie. Wo B eine Stanzung von A verschiebt oder tilgt, folgt die Aufnahme in allen ${changedByB.detectable} `
            + 'beurteilbaren Passagen A. Eine Beschädigung der Rolle oder ein Ausfall am Instrument erklärt diese Lesarten von A '
            + 'nicht. Die Aufnahme folgt auch den Crescendi, die A selbst hat, in beiden Hälften. Auf verformten Instrumenten '
            + 'emuliert, mit langsameren und schnelleren Bälgen, ausgefallenen Ventilen und gebogenen Anschlagskalen, erscheinen '
            + `B und C in höchstens ${decimal(report.deformed_instruments.largest_share_read_as_A_branch_when_B_or_C * 100)} % `
            + 'der Ziehungen als A oder A1. Keine Strecke der Aufnahme weicht über den Zufall hinaus von A ab. Dieselben Skripte '
            + 'ergeben für die Aufnahme von Schmitz\' Exemplar weiterhin C. Die Prämissen schließen ein Instrument ein, dessen '
            + 'Regulierung niemand kennt und dessen Vorsetzer eine Ampico-Mechanik trug, daher wird die Aussage nicht höher als '
            + 'wahrscheinlich gehalten.',
            [...used, a['@id']])])
    }]
}
document.copies.push(copy)

const statedCarriage = (version: Json, certainty: string, note: string): Json => ({
    '@id': { '@id': copy['@id'], carries: [{ '@id': version['@id'] }] },
    annotation: randomUUID(),
    belief: { '@type': 'belief', '@id': randomUUID(), certainty, reasons: [inferred(note, [...used, version['@id']])] }
})

document['@included'] = [
    ...(document['@included'] ?? []),
    statedCarriage(a1, 'possible',
        'Ob die Lesarten, die A1 zu A hinzufügt, vorhanden sind, entscheidet die Aufnahme nicht. Mit den Anschlagstärken von '
        + `Transkun passt A etwas besser (R² ${r2('transkun', 'A')} gegenüber ${r2('transkun', 'A1')}), auf dem Mittel der vier `
        + `Lautstärkemaße A1 (${r2('composite', 'A1')} gegenüber ${r2('composite', 'A')}). Dort liegt die A-posteriori-`
        + `Wahrscheinlichkeit der Lesarten von A1 bei ${share(composite.marginals.A1)}, über der Hälfte aber nur in `
        + `${share(composite.share_of_resamples_above_half.A1)} der Stichproben. In T. 8′ bis 10 zeigt die Lautstärke keine `
        + `Spur des Flackerns des Pianozugs, das A1 hinzufügt, ein schwacher Befund (A in ${share(flicker.share_favouring_A)} `
        + 'der Stichproben vorgezogen).'),
    statedCarriage(b, 'unlikely',
        `Die Hinzufügungen von B fehlen (A-posteriori-Wahrscheinlichkeit ${share(composite.marginals.B)} auf dem Mittel der `
        + 'vier Lautstärkemaße), und wo B Stanzungen von A verschiebt oder tilgt, zeigt die Aufnahme die von A. Das gilt '
        + 'ebenso für B2, C und die Fassungen, die auf B zurückgehen. Für die Una corda in T. 13, die B tilgt, spricht die '
        + `Lautstärke schwach (A in ${share(unaCorda.share_favouring_A)} der Stichproben vorgezogen).`)
]

finish(document, [
    `Transkun R²: A ${r2('transkun', 'A')}, A1 ${r2('transkun', 'A1')}, B ${r2('transkun', 'B')}, C ${r2('transkun', 'C')}`,
    `Mittel der vier Maße R²: A ${r2('composite', 'A')}, A1 ${r2('composite', 'A1')}, B ${r2('composite', 'B')}, C ${r2('composite', 'C')}`,
    `Hinzufügungen von B: ${addedByB.favouring_toggle} von ${addedByB.detectable} Passagen dafür; Änderungen von B an A: ${changedByB.favouring_toggle} von ${changedByB.detectable}`,
    `A-posteriori: A1 ${share(composite.marginals.A1)}, B ${share(composite.marginals.B)}; Flackern ${share(flicker.share_favouring_A)}, Una corda ${share(unaCorda.share_favouring_A)}`,
    `neues Exemplar ${copy['@id']}`
], [
    ...structuralProblems(document),
    ...changedTexts(document, textsBefore).map(siglum => `the text of ${siglum} changed`),
    ...problems
])
