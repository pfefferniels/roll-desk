/**
 * Names the person who sent the scan of Ch1. The copy's source said
 * Spencer Chase, who had died more than a year before the file arrived.
 * It came from Bill Luecht on 12 September 2026.
 *
 * The note says so as well, since the copy no longer states a keeper and
 * would otherwise leave a reader to wonder why the man who scanned it is
 * not the one holding it.
 *
 *     npx vite-node --options.deps.inline=linked-rolls scripts/name-ch1-sender.ts [--write]
 */

import { finish, Json, readEdition, structuralProblems } from './storedEdition'

const WAS = '225.CIS, am 12. September 2026 von Spencer Chase geschickt'
const IS = '225.CIS, am 12. September 2026 von Bill Luecht geschickt'
const PROVENANCE = 'Chase starb im Juni 2025. Die Datei kam von Bill Luecht.'

const document = readEdition()
const copy: Json | undefined = (document.copies ?? []).find((candidate: Json) => candidate.siglum === 'Ch1')
if (!copy) throw new Error('no copy Ch1')

if (copy.readFrom?.output === IS) {
    console.log('  Ch1 nennt den Absender schon')
    process.exit(0)
}

const before = copy.readFrom?.output
copy.readFrom.output = IS
if (!copy.readFrom.note.includes(PROVENANCE)) {
    copy.readFrom.note = `${copy.readFrom.note}\n\n${PROVENANCE}`
}

finish(document, [
    `Ch1: Absender berichtigt, „${before}“ → „${IS}“`,
    'Ch1: die Notiz der Quelle sagt, dass Chase 2025 starb und die Datei von Bill Luecht kam'
], [
    ...structuralProblems(document),
    ...(before === WAS ? [] : [`Ch1 named a sender this correction did not expect: "${before}"`])
])
