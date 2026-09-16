/**
 * Says what the keeper of a copy rests on, wherever the edition holds it
 * at second hand, and takes the keeper off the copy whose holder is not
 * known.
 *
 * crm:P50 names the *current* keeper. Spencer Chase scanned Ch1 in 2004
 * and died in June 2025, he never named an owner for any of his Welte
 * rolls, and the scan reached the edition from Bill Luecht. So the copy
 * has no keeper the edition can state, and the library's reservation
 * says so on its own. Chase stays where he belongs, as the person who
 * read the roll.
 *
 * The other four hold their keeper on someone else's word. That word is
 * now on the statement rather than only in the prose. St1, St2, Wi1 and
 * Ph1 keep a plain keeper: two are catalogued and two were sent by the
 * people holding them.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/state-keeper-provenance.ts [--write]
 */

import { adopted, argued, believing, finish, Json, readEdition, structuralProblems } from './storedEdition'

const CHASE = 'Ch1'

/** What each keeper rests on, and how far the edition holds it. */
const PROVENANCE: Record<string, Json> = {
    Go1: believing('possible', [adopted(
        'Die Sammlung nennen allein die Metadaten der emulierten MIDI-Datei, zusammen mit dem Scandatum. '
        + 'Anderweitig ist beides nicht zu belegen, und Warren Trachtman, der die Rolle 2007 gescannt hat, '
        + 'starb 2017.'
    )]),
    Si1: believing('likely', [argued(
        'Erschlossen: die Plattentasche nennt Richard C. Simonton, dessen Welte-Rollen heute in den USC '
        + 'Libraries liegen. Welches der drei dort verzeichneten Exemplare der Rolle 225 überspielt wurde, '
        + 'ist nicht bekannt.'
    )]),
    Bo1: believing('likely', [adopted(
        'Nach Auskunft Julian Dyers, der die Rolle im Mai 2015 abgetastet hat (Mail, 8.9.2026).'
    )]),
    Sc1: believing('likely', [adopted(
        'Nach dem Booklet der Veröffentlichung, S. 27, hat Hans-W. Schmitz die Rolle bereitgestellt. Die '
        + 'Aufnahme entstand 2012.'
    )])
}

const document = readEdition()
const copies: Json[] = document.copies ?? []

const copyBy = (siglum: string): Json => {
    const copy = copies.find((candidate: Json) => candidate.siglum === siglum)
    if (!copy) throw new Error(`no copy ${siglum}`)
    return copy
}

const stated = Object.keys(PROVENANCE).every(siglum => copyBy(siglum).keeper?.['@annotation'])
if (stated && !copyBy(CHASE).keeper) {
    console.log('  Die Herkunft der Angaben steht schon auf den Exemplaren')
    process.exit(0)
}

const { keeper: chasesKeeper } = copyBy(CHASE)
delete copyBy(CHASE).keeper

Object.entries(PROVENANCE).forEach(([siglum, annotation]) => {
    copyBy(siglum).keeper['@annotation'] = annotation
})

/** A keeper the edition states plainly, which is what a first-hand one should be. */
const plain = copies
    .filter((copy: Json) => copy.keeper && !copy.keeper['@annotation'])
    .map((copy: Json) => copy.siglum)

finish(document, [
    `${CHASE}: Besitzer „${chasesKeeper?.name ?? 'keiner'}“ entfällt. P50 meint den heutigen Besitzer, `
    + 'und Chase ist 2025 gestorben. Er bleibt als Lesender der Rolle stehen',
    ...Object.entries(PROVENANCE).map(([siglum, annotation]) =>
        `${siglum}: Besitzer „${copyBy(siglum).keeper.name}“ ${annotation.belief.certainty}, `
        + `begründet als ${annotation.belief.reasons[0]['@type']}`),
    `aus erster Hand und daher ohne Beleg: ${plain.join(', ')}`
], [
    ...structuralProblems(document),
    ...(copyBy(CHASE).keeper ? [`${CHASE} still states a keeper`] : []),
    ...Object.keys(PROVENANCE)
        .filter(siglum => !copyBy(siglum).keeper?.['@annotation']?.belief)
        .map(siglum => `${siglum} carries no belief about its keeper`)
])
