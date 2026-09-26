/**
 * Types the readings of the perforator settings as what they are,
 * measurements, and states St1's paper as measured on its scan.
 *
 * The advance and the chain pitch of St1, St2, Wi1, Ch1 and Bo1 were each
 * held on the strength of an inference with no premises, the only way the
 * format had to say that a value was taken off the scan by a script.
 * linked-rolls 0.61.0 has the measurement (crmsci:S21) for that. The
 * notes and the files the measurements used stay as they were. Wi1's
 * second reason for its advance argues from the date and stays an
 * inference.
 *
 * St1's paper, „red-lined“, was stated plainly. It now carries a belief
 * concluded by a measurement of the paper's colour and ruling on the scan
 * (punch-225/dates/paper.py), and that belief joins the premises of the
 * copy's dating, for which punch-225/dates/README.md gives the ruling's
 * span on Stanford's dated copies.
 *
 * The notes on the dating of St1, St2 and Wi1 are brought in line with
 * that README, which they cite.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/measure-settings-and-paper.ts [--write]
 */

import { believing, finish, Json, readEdition, structuralProblems } from './storedEdition'

const SETTINGS = ['advance', 'chainPitch'] as const

const document = readEdition()
const copyBy = (siglum: string): Json => {
    const copy = (document.copies ?? []).find((candidate: Json) => candidate.siglum === siglum)
    if (!copy) throw new Error(`no copy ${siglum}`)
    return copy
}

const converted: string[] = []
const report: string[] = []
const problems: string[] = []

/** An inference that takes nothing from other beliefs, as the settings' readings were written. */
const readOffTheScan = (reason: Json) =>
    reason['@type'] === 'inference' && Array.isArray(reason.premises) && reason.premises.length === 0

for (const copy of document.copies as Json[]) {
    const condition = copy.production?.perforator?.condition
    for (const setting of SETTINGS) {
        const reasons: Json[] = condition?.[setting]?.['@annotation']?.belief?.reasons ?? []
        reasons.forEach((reason, i) => {
            if (!readOffTheScan(reason)) return
            reasons[i] = { ...reason, '@type': 'measurement' }
            delete reasons[i].premises
            converted.push(`${copy.siglum}: ${setting}, Grund ${i + 1} als Messung`)
        })
    }
}

const expected = ['St1', 'St2', 'Wi1', 'Ch1', 'Bo1'].flatMap(siglum => SETTINGS.map(setting => `${siglum}: ${setting}, Grund 1 als Messung`))
if (converted.length === 0) {
    console.log('  die Einstellungen sind schon als Messungen geführt')
} else {
    problems.push(...converted.filter(line => !expected.includes(line)).map(line => `converted what this change did not expect: ${line}`))
    problems.push(...expected.filter(line => !converted.includes(line)).map(line => `did not convert: ${line}`))
}
report.push(...converted)

/**
 * The notes on the dating still gave the change of the advance as
 * punch-225/dates/README.md had it before Welte 569 was re-read as
 * December 1909 rather than 1919. It is now the latest copy with the old
 * advance, not an exception after the change, and the old setting runs
 * from 20 November 1908 to 16 December 1909. The notes cite that README,
 * so they now say what it says.
 */
const corrections: [string, (copy: Json) => Json, string, string][] = [
    ['St1', copy => dateReason(copy, 1),
        'ist an den datierten Stanford-Kopien vom 4. März 1907 bis 4. November 1909 belegt, danach nur noch einmal, im Dezember 1919 (Welte 569). Zwischen 4. November 1909 und 21. Mai 1910 wurde der Vorschub halbiert',
        'ist an den datierten Stanford-Kopien vom 20. November 1908 bis 16. Dezember 1909 belegt. Zwischen 16. Dezember 1909 und 21. Mai 1910 wurde der Vorschub halbiert'],
    ['St2', copy => dateReason(copy, 1),
        'die zwischen 4. November 1909 und 21. Mai 1910 lag',
        'die zwischen 16. Dezember 1909 und 21. Mai 1910 lag'],
    ['Wi1', copy => dateReason(copy, 1),
        'die Kopie vor die Halbierung des Vorschubs zwischen 4. November 1909 und 21. Mai 1910',
        'die Kopie vor die Halbierung des Vorschubs zwischen 16. Dezember 1909 und 21. Mai 1910'],
    ['Wi1', copy => dateReason(copy, 1),
        'Treffen beide zu, ist Wi1 nach Welte 569 (Dezember 1919) die zweite bekannte Kopie, die nach der Umstellung noch mit der alten Einstellung gestanzt wurde',
        'Treffen beide zu, ist Wi1 die einzige bekannte Kopie, die nach der Umstellung noch mit der alten Einstellung gestanzt wurde'],
    ['Wi1', copy => copy.production.perforator.condition.advance['@annotation'].belief.reasons[1],
        'Nach der Halbierung des Vorschubs zwischen 4. November 1909 und 21. Mai 1910 ist ein Vorschub von 1,00 mm an den datierten Stanford-Kopien nur noch einmal belegt, an Welte 569 vom Dezember 1919',
        'Nach der Halbierung des Vorschubs zwischen 16. Dezember 1909 und 21. Mai 1910 ist ein Vorschub von 1,00 mm an den datierten Stanford-Kopien nicht mehr belegt']
]

function dateReason(copy: Json, i: number): Json {
    return copy.production.date['@annotation'].belief.reasons[i]
}

for (const [siglum, reasonOf, was, is] of corrections) {
    const reason = reasonOf(copyBy(siglum))
    if (reason.note.includes(is)) continue
    if (!reason.note.includes(was)) {
        problems.push(`${siglum}: a note this correction did not expect: ${reason.note}`)
        continue
    }
    reason.note = reason.note.replace(was, is)
    report.push(`${siglum}: „${was.slice(0, 50)}…“ → „${is.slice(0, 50)}…“`)
}

// St1's paper, held on the strength of a measurement on the scan.
const SCAN = 'https://stacks.stanford.edu/image/iiif/mf320jq4997%2Fmf320jq4997_0001/'
const PAPER_NOTE = 'Gemessen an der Aufnahme, an zwei Streifen von 3000 Pixeln in voller Auflösung aus der Mitte '
    + 'und vom Ende der Musik, ohne die Löcher. Rot: Der Papiergrund liest im Median R 87, G 42, B 32, im Rotkanal '
    + 'doppelt so hell wie im Grünkanal. Das Mittelgrau der Graukarte am Anfang derselben Aufnahme liest 34, 35, 34, '
    + 'fast neutral, die Röte ist also die des Papiers. Liniert: Der Länge nach laufen dunkle Linien über das Papier '
    + '(R 63, G 31, B 24), eine auf jede Spur; ihr Abstand ist 37,8 Pixel, der Spurabstand 37,76 Pixel. Auf dem Schluss '
    + 'hinter dem letzten Loch findet punch-225/dates/paper.py die Linien mit der Stärke 5152, unlinierte Kopien '
    + 'kommen dort höchstens auf 15 (punch-225/dates/README.md).'
const st1 = copyBy('St1')
const paper = st1.production.paper
if (paper?.name !== 'red-lined') {
    problems.push(`St1: a paper this change did not expect: ${JSON.stringify(paper)}`)
} else if (!paper['@annotation']) {
    paper['@annotation'] = believing('true', [{ '@type': 'measurement', note: PAPER_NOTE, used: [SCAN] }])
    report.push('St1: das Papier, „red-lined“, als wahr gehalten, aus einer Messung an der Aufnahme')
}

/**
 * The dating of St1 argues from the setting; the ruled paper points to the
 * same years, so its belief becomes the third premise and the note says why.
 */
const PAPER_PREMISE = 'Das linierte Papier weist in dieselbe Zeit. Liniertes rotes Papier ist an den datierten '
    + 'Stanford-Kopien vom 20. Januar 1907 bis 4. Januar 1910 belegt, danach nur noch einmal, unsicher gelesen, 1916; '
    + 'unliniertes lief die ganze Zeit daneben (punch-225/dates/README.md).'
const dating = dateReason(st1, 1)
const paperBelief: string | undefined = paper?.['@annotation']?.belief?.['@id']
if (dating['@type'] !== 'inference' || !dating.premises.includes('560debaf-2be3-4832-a747-591a99a66e8b')) {
    problems.push(`St1: a dating this change did not expect: ${JSON.stringify(dating)}`)
} else if (paperBelief && !dating.premises.includes(paperBelief)) {
    dating.premises = [paperBelief, ...dating.premises]
    dating.note = `${dating.note} ${PAPER_PREMISE}`
    report.push('St1: die Datierung schließt auch aus dem Papier')
}

finish(document, report, [...structuralProblems(document), ...problems])
