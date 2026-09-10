/**
 * Prepares the edition of WM 225 for publication: it fills in what the
 * Chase and the Dyer copy do not say about themselves, repairs the
 * collation where it demonstrably went wrong, states the two transfers
 * as acts, and gives every edit of the two transfers a motivation.
 *
 *     node scripts/enrich-edition.ts <edition.jsonld> [--write]
 *
 * Each phase is a claim about the text and is reported before it is
 * written. Without --write the script only reports.
 *
 * The repairs rest on an all-with-all collation of the five copies made
 * from the perforations alone, without reading the version tree, and on
 * a second one at the level of the interval, which is the only level at
 * which the green copy can be collated with a red one at all. Both come
 * out perfectly nested, so the tree the edition already had is the tree
 * the witnesses give; what follows corrects where individual readings
 * were put, not the shape.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import Ajv from 'ajv'

// The schema of the checked-out library rather than the one in node_modules:
// the installed copy is older than the multi-system format this edition is in.
const SCHEMA = new URL('../../linked-rolls/src/schema.json', import.meta.url)
const TARGET = new URL('../../welte225.org/edition.jsonld', import.meta.url)

// The script edits the stored JSON-LD document directly, which has no type of
// its own: the library types describe the in-memory edition, not the file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

const [sourcePath, flag] = process.argv.slice(2)
if (!sourcePath) {
    console.error('usage: node scripts/enrich-edition.ts <edition.jsonld> [--write]')
    process.exit(1)
}
const write = flag === '--write'

const CHASE = 'copy/6e1ce072-7490-44b6-b8e8-eb1bbffc3cad'
const DYER = 'copy/9ae56c3e-b058-4972-9895-96946c6b93f8'

/** Where the green copy's rewind begins on the edition's axis. Everything beyond it is the scanner's. */
const REWIND = 10324.6

/**
 * The tolerance the edition is collated at.
 *
 * Five millimetres sits below the spread of the copies: the Licensee copy's
 * residuals against the red ones reach 3.1 mm at the 90th percentile and
 * individual punches go further, so at five the collation splits one reading
 * into two often enough to invent variants. Two punches of one reading never
 * lie closer than 21.5 mm on that copy and 10.9 mm on Stanford-1, so up to
 * eight the matcher cannot reach a neighbour by mistake; at twelve it can.
 * Eight is therefore the largest safe figure, and the census is cleaner
 * there: the readings peculiar to one copy fall from 10 to 9 on Stanford-1,
 * from 58 to 55 on the Widuch copy and from 7 to 5 on the Licensee copy,
 * with no new grouping appearing anywhere.
 */
const COLLATION_TOLERANCE = 8

const document: Json = JSON.parse(readFileSync(sourcePath, 'utf-8'))

// --------------------------------------------------------- reading the roll

const SHORT: Record<string, string> = {
    'copy/d229954b-086c-44d6-a589-aaa324d31d88': 'S1',
    'copy/88460599-2e0d-4759-851c-903a5a521997': 'S2',
    'copy/a7ff95b7-f43a-4341-ba86-80fa4e84499c': 'W',
    [CHASE]: 'L',
    [DYER]: 'G'
}

const BAR_OF: Record<string, 't100' | 'lic' | 'green'> =
    { S1: 't100', S2: 't100', W: 't100', L: 'lic', G: 'green' }

const T100: Record<number, string> = {
    1: 'MezzoforteOff', 2: 'MezzoforteOn', 3: 'SlowCrescendoOff', 4: 'SlowCrescendoOn',
    5: 'ForzandoOff', 6: 'ForzandoOn', 7: 'SoftPedalOff', 8: 'SoftPedalOn',
    9: 'MotorOff', 10: 'MotorOn', 91: 'Rewind', 92: 'ElectricCutOff',
    93: 'SustainPedalOn', 94: 'SustainPedalOff', 95: 'ForzandoOn', 96: 'ForzandoOff',
    97: 'SlowCrescendoOn', 98: 'SlowCrescendoOff', 99: 'MezzoforteOn', 100: 'MezzoforteOff'
}
const LICENSEE: Record<number, string> = {
    1: 'MezzoforteOff', 2: 'MezzoforteOn', 3: 'SlowCrescendoOff', 4: 'SlowCrescendoOn',
    5: 'ForzandoOff', 6: 'ForzandoOn', 7: 'SoftPedalOff', 8: 'SoftPedalOn',
    89: 'Rewind', 90: 'ElectricCutOff', 91: 'SustainPedalOn', 92: 'SustainPedalOff',
    93: 'ForzandoOn', 94: 'ForzandoOff', 95: 'SlowCrescendoOn', 96: 'SlowCrescendoOff',
    97: 'MezzoforteOn', 98: 'MezzoforteOff'
}
const GREEN: Record<number, string> = {
    1: 'SforzandoPiano', 2: 'Mezzoforte', 3: 'SustainPedal', 4: 'Crescendo', 5: 'SforzandoForte',
    94: 'SforzandoForte', 95: 'Crescendo', 96: 'SoftPedal', 97: 'Mezzoforte', 98: 'SforzandoPiano'
}
const NOTE_BLOCK = { t100: [11, 90, 24], lic: [9, 88, 24], green: [6, 93, 21] } as const
const BASS_UP_TO = { t100: 10, lic: 8, green: 5 } as const
const VALVES = { t100: T100, lic: LICENSEE, green: GREEN } as const

interface Feature { copy: string, from: number, to: number, track: number }

const featureIndex = new Map<string, Feature>(
    document.copies.flatMap((copy: Json) => {
        const name = SHORT[copy['@id']] ?? copy['@id']
        return copy.features.map((feature: Json) => [feature['@id'], {
            copy: name,
            from: feature.horizontal.from,
            to: feature.horizontal.to,
            track: feature.vertical.from
        }] as const)
    })
)

/** What the tracker bar of the feature's copy reads at that track, as a key. */
const readingOfFeature = (feature: Feature): string | undefined => {
    const bar = BAR_OF[feature.copy]
    const [low, high, lowest] = NOTE_BLOCK[bar]
    if (feature.track >= low && feature.track <= high) return `note:${lowest + feature.track - low}`
    const valve = VALVES[bar][feature.track]
    if (!valve) return undefined
    return `${valve}:${feature.track <= BASS_UP_TO[bar] ? 'bass' : 'treble'}`
}

/** What the symbol says, as the same key. */
const readingOfSymbol = (symbol: Json): string =>
    symbol['@type'] === 'note' ? `note:${symbol.pitch}` : `${symbol.expressionType}:${symbol.scope}`

// ------------------------------------------------------- walking the tree

const versionBy = (siglum: string): Json => {
    const version = document.versions.find((v: Json) => v.siglum === siglum)
    if (!version) throw new Error(`no version ${siglum} in ${sourcePath}`)
    return version
}

const versionById = (id: string): Json | undefined =>
    document.versions.find((v: Json) => v['@id'] === id)

const editsOf = (version: Json): Json[] => version.edits

const insertionsOf = (version: Json): Json[] =>
    editsOf(version).flatMap((edit: Json) => edit.insert ?? [])

/** Every symbol the edition ever inserts, by id, with the version that inserts it. */
const symbolIndex = () => {
    const symbols = new Map<string, Json>()
    const home = new Map<string, Json>()
    document.versions.forEach((version: Json) =>
        insertionsOf(version).forEach((symbol: Json) => {
            symbols.set(symbol['@id'], symbol)
            home.set(symbol['@id'], version)
        }))
    return { symbols, home }
}

const carriersOf = (symbol: Json): Feature[] =>
    (symbol.carriers ?? [])
        .map((carrier: Json) => featureIndex.get(carrier['@id']))
        .filter((feature: Feature | undefined): feature is Feature => feature !== undefined)

const witnessesOf = (symbol: Json): string[] =>
    [...new Set(carriersOf(symbol).map(carrier => carrier.copy))].sort()

const spanOf = (symbol: Json): { from: number, to: number } | undefined => {
    const carriers = carriersOf(symbol)
    if (carriers.length === 0) return undefined
    return {
        from: carriers.reduce((sum, c) => sum + c.from, 0) / carriers.length,
        to: carriers.reduce((sum, c) => sum + c.to, 0) / carriers.length
    }
}

const onsetOf = (symbol: Json): number | undefined => spanOf(symbol)?.from

const withoutKey = (object: Json, key: string): Json =>
    Object.fromEntries(Object.entries(object).filter(([name]) => name !== key))

/** Drops the named symbols from a version's insertions, pruning edits left empty. */
const dropInsertions = (version: Json, ids: ReadonlySet<string>) => {
    version.edits = editsOf(version)
        .map((edit: Json) => ({ ...edit, insert: (edit.insert ?? []).filter((s: Json) => !ids.has(s['@id'])) }))
        .filter((edit: Json) => edit.insert.length > 0 || (edit.delete?.length ?? 0) > 0)
        .map((edit: Json) => (edit.insert.length === 0 ? withoutKey(edit, 'insert') : edit))
}

/** Drops the named deletions from every version, pruning edits left empty. */
const dropDeletions = (ids: ReadonlySet<string>) =>
    document.versions.forEach((version: Json) => {
        version.edits = editsOf(version)
            .map((edit: Json) => ({ ...edit, delete: (edit.delete ?? []).filter((id: string) => !ids.has(id)) }))
            .filter((edit: Json) => (edit.insert?.length ?? 0) > 0 || edit.delete.length > 0)
            .map((edit: Json) => (edit.delete.length === 0 ? withoutKey(edit, 'delete') : edit))
    })

const deletes = (version: Json, id: string): boolean =>
    editsOf(version).some((edit: Json) => (edit.delete ?? []).includes(id))

/** Strikes one deletion in one version, leaving the same deletion elsewhere alone. */
const dropDeletionIn = (version: Json, id: string) => {
    version.edits = editsOf(version)
        .map((edit: Json) => ({ ...edit, delete: (edit.delete ?? []).filter((other: string) => other !== id) }))
        .filter((edit: Json) => (edit.insert?.length ?? 0) > 0 || edit.delete.length > 0)
        .map((edit: Json) => (edit.delete.length === 0 ? withoutKey(edit, 'delete') : edit))
}

/** The symbols a version shows: what it and its ancestors insert, less everything struck along the way. */
const snapshotOf = (siglum: string): Json[] => {
    const lineage: Json[] = []
    for (let version: Json | undefined = versionBy(siglum); version; version = version.basedOn && versionById(version.basedOn['@id'])) {
        lineage.unshift(version)
    }
    const struck = new Set<string>()
    const kept: Json[] = []
    lineage.forEach(version => editsOf(version).forEach((edit: Json) => {
        (edit.delete ?? []).forEach((id: string) => struck.add(id));
        (edit.insert ?? []).forEach((symbol: Json) => kept.push(symbol))
    }))
    return kept.filter(symbol => !struck.has(symbol['@id']))
}

// ------------------------------------------------- assumptions, as exported

const believing = (certainty: string, reasons: Json[]): Json => ({
    '@id': randomUUID(),
    belief: { '@type': 'belief', '@id': randomUUID(), certainty, reasons }
})
const adopted = (note: string): Json => ({ '@type': 'beliefAdoption', note })
const argued = (note: string): Json => ({ '@type': 'simpleArgumentation', note })
const person = (name: string): Json => ({ name, sameAs: [] })

// ---------------------------------------------------------------- the copies

const copyBy = (id: string): Json => {
    const copy = document.copies.find((c: Json) => c['@id'] === id)
    if (!copy) throw new Error(`no copy ${id} in ${sourcePath}`)
    return copy
}

const enrichChase = (): string[] => {
    const copy = copyBy(CHASE)
    copy.measurements.scanResolution = { value: 400, unit: 'px/in' }
    copy.production.speed['@annotation'] = believing('likely', [argued(
        'Die Datei W225E.ann nennt roll_tempo 83. Der Leser rechnet zehn Einheiten auf den Fuß je Minute. '
        + 'Es ist die Geschwindigkeit, auf die Chase seine Lesung gestellt hat, kein Wert von der Rolle.'
    )])
    delete copy.readFrom.device
    copy.readFrom.actor = person('Chase, Spencer')
    copy.readFrom.output = 'W225E.bar mit W225E.ann, am 26. Dezember 2024 von Spencer Chase geschickt'
    copy.readFrom.note =
        'Das Lauflängenbild der Abtastleiste, 400 Zeilen auf den Zoll entlang der Rolle, gelesen auf der '
        + 'Licensee-Leiste, deren Nummerierung die Datei behält. Das Gerät ist nicht überliefert; Chase hat '
        + 'Scanner-Chassis für andere gebaut, so dass sich die Maschine aus der Datei nicht erschließen lässt. '
        + 'Die mitgeschickten W225emR.mid und W225emP.mid sind Emulationen und wurden nicht gelesen. Da die '
        + 'Rolle pneumatisch gelesen wurde, ist die Länge einer Notenstanzung eine Ventilöffnungszeit und kein '
        + 'Lochmaß; Abweichungen am Ende einer Note taugen auf diesem Exemplar nicht als Befund.'

    return [
        'Chase: scanResolution 400 px/in ergänzt (die Zeilen des .bar-Bildes)',
        'Chase: Papiergeschwindigkeit mit ihrer Herkunft belegt (roll_tempo 83 aus der .ann)',
        'Chase: readFrom nennt den Lesenden, die Dateien und den Vorbehalt gegen Notenenden'
    ]
}

const enrichDyer = (): string[] => {
    const copy = copyBy(DYER)
    copy.production.company = { name: 'M. Welte & Söhne', sameAs: [] }
    copy.readFrom.actor = person('Dyer, Julian')
    copy.readFrom.date = {
        '@value': '2015-05-01',
        '@type': 'xsd:date',
        '@annotation': believing('likely', [adopted(
            'Die CIS-Datei, die Julian Dyer geschickt hat, ist auf Mai 2015 datiert. Der Tag steht nicht dabei; '
            + 'der Erste des Monats vertritt hier den Monat.'
        )])
    }
    copy.readFrom.output = 'WelteT98_225_Gruenfeld_Traeumerei.CIS'
    copy.readFrom.note =
        'Optische Abtastung durch Julian Dyer aus der Sammlung Peter Both; die CIS-Datei kam am 8. September 2026 '
        + 'per Mail, wurde mit cis2roll.py in ein lesbares TIFF überführt und mit dem roll-image-parser von SUPRA '
        + 'analysiert. Der Rückspulbefehl ist eine 499 mm lange Perforation auf der Bassbahn 1, die zugleich die '
        + 'Sforzando-piano-Position ist, und beginnt bei 10324,6 mm der Editionsachse. Dahinter folgt eine '
        + 'Eichtreppe über alle 98 Bahnen, 361 Perforationen, die zum Scanner gehören und nicht auf das Papier.'

    return [
        'Dyer: Hersteller M. Welte & Söhne ergänzt',
        'Dyer: readFrom nennt den Lesenden, die Datei und das Datum der Abtastung',
        'Dyer: Rückspulbefehl und Eichtreppe in der Notiz der Quelle festgehalten'
    ]
}

// ------------------------------------------------------------- the repairs

/**
 * Two pairs of symbols share every one of their carriers, so each of them
 * names features on tracks that read as something else. A carrier is kept
 * only where the bar of its copy reads what the symbol says; a rejected one
 * is offered to the symbol that does say it.
 */
const untangleSharedCarriers = (): string[] => {
    const { symbols } = symbolIndex()
    const homeless: { id: string, feature: Feature }[] = []

    symbols.forEach(symbol => {
        const wanted = readingOfSymbol(symbol)
        const kept = (symbol.carriers ?? []).filter((carrier: Json) => {
            const feature = featureIndex.get(carrier['@id'])
            if (!feature) return true
            if (readingOfFeature(feature) === wanted) return true
            homeless.push({ id: carrier['@id'], feature })
            return false
        })
        if (kept.length !== (symbol.carriers ?? []).length) symbol.carriers = kept
    })

    const carries = (symbol: Json, id: string) =>
        (symbol.carriers ?? []).some((carrier: Json) => carrier['@id'] === id)

    const adopted = homeless.filter(({ id, feature }) => {
        const wanted = readingOfFeature(feature)
        const host = [...symbols.values()].find(symbol => {
            if (readingOfSymbol(symbol) !== wanted) return false
            const span = spanOf(symbol)
            return span !== undefined
                && Math.abs(span.from - feature.from) <= COLLATION_TOLERANCE
                && Math.abs(span.to - feature.to) <= COLLATION_TOLERANCE
        })
        if (!host) return false
        // The rejected carrier often already stands on its rightful symbol as well;
        // adding it a second time would leave the symbol carrying itself twice.
        if (!carries(host, id)) host.carriers.push({ '@id': id })
        return true
    })

    const stray = new Set(homeless.map(({ id }) => id))
    adopted.forEach(({ id }) => stray.delete(id))
    return [
        `Träger: ${homeless.length} Zuordnungen gelöst, bei denen die Bahn etwas anderes liest als das Symbol sagt`,
        `Träger: ${adopted.length} davon dem Symbol gegeben, das sie tatsächlich tragen`
            + (stray.size ? `, ${stray.size} ohne Symbol geblieben` : '')
    ]
}

/**
 * One perforation of the Licensee copy carried two symbols of the same
 * reading at the same place, one entered in A beside the Widuch copy and
 * one in C beside Stanford-2. It is one reading of three witnesses.
 */
const mergeDuplicateSymbols = (): string[] => {
    const { symbols, home } = symbolIndex()
    const byFeature = new Map<string, string[]>()
    symbols.forEach((symbol, id) =>
        (symbol.carriers ?? []).forEach((carrier: Json) => {
            const seen = byFeature.get(carrier['@id'])
            if (seen) seen.push(id); else byFeature.set(carrier['@id'], [id])
        }))

    const merged: string[] = []
    byFeature.forEach(named => {
        const ids = [...new Set(named)]
        if (ids.length < 2) return
        const readings = new Set(ids.map(id => readingOfSymbol(symbols.get(id)!)))
        if (readings.size !== 1) return

        // The elder symbol keeps the reading; the younger hands over its carriers.
        const depth = (id: string) => document.versions.indexOf(home.get(id)!)
        const [elder, ...rest] = [...ids].sort((a, b) => depth(a) - depth(b))
        rest.forEach(id => {
            const younger = symbols.get(id)!
            const known = new Set((symbols.get(elder)!.carriers ?? []).map((c: Json) => c['@id']))
            ;(younger.carriers ?? []).forEach((carrier: Json) => {
                if (!known.has(carrier['@id'])) symbols.get(elder)!.carriers.push(carrier)
            })
            dropInsertions(home.get(id)!, new Set([id]))
            dropDeletions(new Set([id]))
            merged.push(id)
        })
    })
    return [`Symbole: ${merged.length} Dubletten mit einer Fassung verschmolzen`]
}

/**
 * A perforation that carries no symbol while a symbol of the same reading
 * stands beside it within the tolerance is a witness of that symbol. Nine
 * red punches at the end of the roll are of that kind, and five of them
 * turn supposed additions of the Licensee copy into readings of the
 * tradition. Punches before the first note and behind the rewind are left
 * alone: they are leader, tempo block and rewind, not text.
 */
const adoptOrphanPunches = (): string[] => {
    const { symbols } = symbolIndex()
    const carried = new Set<string>()
    symbols.forEach(symbol => (symbol.carriers ?? []).forEach((c: Json) => carried.add(c['@id'])))

    const inTheMusic = ([, feature]: [string, Feature]) =>
        feature.from > 1000 && feature.from < REWIND

    let taken = 0
    ;[...featureIndex.entries()]
        .filter(([id]) => !carried.has(id))
        .filter(inTheMusic)
        .forEach(([id, feature]) => {
            const wanted = readingOfFeature(feature)
            if (!wanted) return
            const host = [...symbols.values()].find(symbol => {
                const span = spanOf(symbol)
                return readingOfSymbol(symbol) === wanted && span !== undefined
                    && Math.abs(span.from - feature.from) <= COLLATION_TOLERANCE
                    && Math.abs(span.to - feature.to) <= COLLATION_TOLERANCE
                    && !witnessesOf(symbol).includes(feature.copy)
            })
            if (!host) return
            host.carriers.push({ '@id': id })
            taken += 1
        })
    return [`Verwaiste Stanzungen: ${taken} Perforationen dem Symbol zugeordnet, das sie bezeugen`]
}

/** The version each copy is the witness of. Stanford-1 stands for B until B1 is split off. */
const WITNESSED: Record<string, string> = { W: 'A1', S1: 'B', S2: 'C', L: 'D1', G: 'D2' }

/** A version and its ancestors, the root last. */
const ancestryOf = (siglum: string): string[] => {
    const line: string[] = []
    for (let version: Json | undefined = versionBy(siglum); version;
        version = version.basedOn && versionById(version.basedOn['@id'])) {
        line.push(version.siglum)
    }
    return line
}

/**
 * The version a reading belongs to: the latest one every witness descends
 * from. A reading two branches attest is ancestral however few copies carry
 * it, which is why this asks the tree and not the number of witnesses.
 */
const homeOf = (witnesses: readonly string[]): string | undefined => {
    const lines = witnesses.map(name => ancestryOf(WITNESSED[name]))
    if (lines.length === 0) return undefined
    return lines[0].find(siglum => lines.every(line => line.includes(siglum)))
}

/**
 * The whole edition collated once more at the tolerance the copies call for.
 * Two symbols that say the same thing at the same place are one reading, so
 * the elder takes the younger's witnesses, and the reading then belongs to
 * the earliest version all its witnesses agree on.
 */
const recollate = (): string[] => {
    const { symbols, home } = symbolIndex()
    const depth = (id: string) => document.versions.indexOf(home.get(id)!)
    const ordered = [...symbols.keys()].sort((a, b) => depth(a) - depth(b))

    const gone = new Set<string>()
    const touched = new Set<string>()
    ordered.forEach(elderId => {
        if (gone.has(elderId)) return
        const elder = symbols.get(elderId)!
        ordered.forEach(youngerId => {
            if (youngerId === elderId || gone.has(youngerId)) return
            const younger = symbols.get(youngerId)!
            if (readingOfSymbol(younger) !== readingOfSymbol(elder)) return
            const here = spanOf(elder)
            const there = spanOf(younger)
            if (!here || !there) return
            if (Math.abs(here.from - there.from) > COLLATION_TOLERANCE) return
            if (Math.abs(here.to - there.to) > COLLATION_TOLERANCE) return
            // Two copies never witness one reading twice; that would be two punches.
            if (witnessesOf(younger).some(name => witnessesOf(elder).includes(name))) return

            elder.carriers.push(...(younger.carriers ?? []))
            dropInsertions(home.get(youngerId)!, new Set([youngerId]))
            dropDeletions(new Set([youngerId]))
            // A version that founded its own symbol for a reading usually
            // struck the one it did not recognise; now that the two are one,
            // that deletion would strike the reading its own copy attests.
            if (deletes(home.get(youngerId)!, elderId)) dropDeletionIn(home.get(youngerId)!, elderId)
            gone.add(youngerId)
            touched.add(elderId)
        })
    })

    // Every symbol sits in the earliest version all its witnesses agree on.
    const moved = [...symbols.keys()].filter(id => {
        if (gone.has(id)) return false
        const symbol = symbols.get(id)!
        const witnesses = witnessesOf(symbol)
        if (witnesses.length === 0) return false
        const target = homeOf(witnesses)
        if (!target || target === home.get(id)!.siglum) return false
        dropInsertions(home.get(id)!, new Set([id]))
        editsOf(versionBy(target)).push({ '@type': 'edit', '@id': randomUUID(), insert: [symbol] })
        return true
    })

    document.creation.collationTolerance =
        { toleranceStart: COLLATION_TOLERANCE, toleranceEnd: COLLATION_TOLERANCE }
    document.versions.forEach((version: Json) => {
        if (version.basedOn) version.basedOn.collationTolerance =
            { toleranceStart: COLLATION_TOLERANCE, toleranceEnd: COLLATION_TOLERANCE }
    })

    return [
        `Kollation bei ${COLLATION_TOLERANCE} mm: ${gone.size} Symbole mit dem vereinigt, das dieselbe Lesart trägt`,
        `Kollation: ${moved.length} davon in die Fassung gehoben, die ihre Zeugen tragen`,
        `Kollationstoleranz der Edition und aller Ableitungen auf ${COLLATION_TOLERANCE} mm gesetzt`
    ]
}

/**
 * A pedal release that only the Widuch copy lacks was entered as an addition
 * of version B, where it would resolve a redundancy already standing in A.
 * Nothing added ever makes an existing redundancy meaningful, so the release
 * belongs to A and the Widuch copy is what lost it.
 */
const liftAncestralRelease = (): string[] => {
    const b = versionBy('B')
    const target = insertionsOf(b).find(symbol =>
        symbol['@type'] === 'expression'
        && symbol.expressionType === 'SustainPedalOff'
        && Math.abs((onsetOf(symbol) ?? 0) - 5370.8) < 2)
    if (!target) return ['Fassung A: die Pedalauslösung bei 5370,8 mm war nicht zu finden']

    dropInsertions(b, new Set([target['@id']]))
    editsOf(versionBy('A')).push({ '@type': 'edit', '@id': randomUUID(), insert: [target] })

    const a1 = versionBy('A1')
    a1.motivations.push({
        '@type': 'motivation', '@id': 'pedal-held-through',
        note: 'Das Dämpferpedal bleibt über die Phrase hinweg getreten'
    })
    editsOf(a1).push({
        '@type': 'edit', '@id': randomUUID(),
        motivation: 'pedal-held-through',
        delete: [target['@id']],
        '@annotation': believing('likely', [argued(
            'Das Loslassen bei 5370,8 mm fehlt allein auf dem Exemplar Widuch. Es steht auf Stanford-1, '
            + 'Stanford-2 und der Licensee-Kopie, und die grüne Kopie hält das Pedal genau bis dorthin. Bliebe '
            + 'es eine Zutat der Fassung B, so machte diese Zutat eine in A bereits stehende Redundanz sinnvoll, '
            + 'was Bearbeitungen nicht tun. Also steht es in A und dieses Exemplar hat es verloren.'
        )])
    })
    return ['Fassung A: die Pedalauslösung bei 5370,8 mm aus B nach A gehoben, in A1 getilgt']
}

/**
 * Six readings stand on Stanford-1 alone. Entered as additions of B they
 * make version C withdraw five working differentiations, which is not how
 * this tradition works. They are the copy's own layer and get a version of
 * their own, a sister of C beneath B, exactly as the Widuch copy has one
 * beneath A.
 */
const splitOffStanfordUnicum = (): string[] => {
    const b = versionBy('B')
    const c = versionBy('C')
    const own = insertionsOf(b).filter(symbol => {
        const witnesses = witnessesOf(symbol)
        return witnesses.length === 1 && witnesses[0] === 'S1'
    })
    if (own.length === 0) return ['Fassung B1: keine Lesarten allein auf Stanford-1 gefunden']

    const ids = new Set(own.map(symbol => symbol['@id']))
    dropInsertions(b, ids)
    dropDeletions(ids)

    document.versions.push({
        '@type': 'Version',
        '@id': randomUUID(),
        siglum: 'B1',
        system: JSON.parse(JSON.stringify(b.system)),
        versionType: 'unicum',
        basedOn: {
            '@id': b['@id'],
            collationTolerance: { toleranceStart: COLLATION_TOLERANCE, toleranceEnd: COLLATION_TOLERANCE }
        },
        motivations: [{
            '@type': 'motivation', '@id': 'bass-crescendo-added',
            note: 'Zusätzliches Crescendo im Bass'
        }],
        edits: own.map(symbol => ({
            '@type': 'edit', '@id': randomUUID(),
            motivation: 'bass-crescendo-added',
            insert: [symbol]
        }))
    })

    // Why these readings sit here and not in B is an assumption about the
    // derivation, not a reason for the edits, so it belongs on the derivation.
    const b1 = versionBy('B1')
    b1.basedOn['@annotation'] = believing('likely', [argued(
        'Diese Lesarten trägt allein Stanford-1. Hingen sie an der Fassung B, so nähme die Fassung C wirksame '
        + 'Differenzierungen zurück, darunter ein vollständiges Crescendo-Paar. Da bestehende Differenzierungen '
        + 'nicht mutwillig zurückgenommen werden, sind sie die eigene Schicht dieses Exemplars. Eine von ihnen, '
        + 'das Crescendo an bei 7364,7 mm, wäre in B redundant und hätte auch als Bereinigung durch C erklärt '
        + 'werden können.'
    )])
    void c
    return [`Fassung B1 angelegt: ${own.length} Lesarten allein auf Stanford-1, Schwester von C unter B`]
}

/**
 * What the re-collation moves out of the archetype and into the Widuch
 * copy's own version, and why. An archetype holds what two branches attest;
 * a reading only one copy carries is that copy's, unless something else
 * argues it was lost twice over.
 */
const nameTheWiduchLayer = (): string[] => {
    const a1 = versionBy('A1')
    a1.versionType = 'unicum'

    // Fifty-two readings with fifty-two local reasons: one motivation over all
    // of them would say nothing about any. Why they sit here rather than in the
    // archetype is a statement about the derivation, and goes there.
    a1.basedOn['@annotation'] = believing('likely', [argued(
        'Zweiundfünfzig dieser Lesarten trägt allein das Exemplar Widuch. Stünden sie in der Fassung A, so ließe '
        + 'die Fassung B ebenso viele wirksame Differenzierungen fallen. Da bestehende Differenzierungen nicht '
        + 'mutwillig zurückgenommen werden, sind sie die eigene Schicht dieses Exemplars, und die Fassung A '
        + 'behält, was zwei Äste bezeugen: 657 Lesarten aller vier Kopien und elf, die über die Astgrenze hinweg '
        + 'bezeugt sind.'
    )])

    const bare = editsOf(a1).filter((edit: Json) => !edit.motivation).length
    return [
        `A1: versionType auf unicum gesetzt, die Begründung der Ableitung an ihr vermerkt`
        + ` (${bare} Bearbeitungen warten noch auf eine eigene Motivation)`
    ]
}

/** Deletions naming a symbol no version inserts, left by an earlier re-import. */
const dropDanglingDeletions = (): string[] => {
    const { symbols } = symbolIndex()
    const dangling = new Set<string>(
        document.versions.flatMap((version: Json) =>
            editsOf(version).flatMap((edit: Json) => (edit.delete ?? []).filter((id: string) => !symbols.has(id)))))
    dropDeletions(dangling)
    return [`Tilgungen: ${dangling.size} Verweise entfernt, die auf kein Symbol zeigen`]
}

// -------------------------------------------------------------- the versions

const enrichVersionCreation = (): string[] => {
    versionBy('D1').creation = {
        procedure: { name: 'Umstanzung für ein anderes Wiedergabesystem', sameAs: [] }
    }
    versionBy('D2').creation = {
        procedure: { name: 'Umstanzung für ein anderes Wiedergabesystem', sameAs: [] },
        actor: {
            ...person('Kähle'),
            '@annotation': believing('possible', [adopted(
                'Rex Lawson, Pianola Journal 20 (2009), S. 26: auf einigen der zweiten Masterrollen in USC steht der '
                + 'Name Kähle als desjenigen, der sie für das spätere 98-tönige grüne System „corrigiert" habe, wobei '
                + 'die Arbeit zum Teil darin bestand, die Pedalbahnen so neu zu legen, dass keine Perforation lang '
                + 'genug wurde, um das Papier zu schwächen. Die Aufschrift nennt einen Mann, der zweite Master '
                + 'korrigiert hat. Dass er diesen korrigiert hat, sagt sie nicht.'
            )])
        }
    }
    return [
        'D1: creation mit der Umstanzung als Verfahren',
        'D2: creation mit der Umstanzung als Verfahren und Kähle als möglichem Korrektor (Lawson 2009)'
    ]
}

/**
 * The six symbols both transfers delete, which no witness below C carries.
 * They leave D1 and D2 and become deletions of C, where their witness puts them.
 */
const relocateSharedDeletions = (): string[] => {
    const { symbols } = symbolIndex()
    const deletedIn = (version: Json): Set<string> =>
        new Set(editsOf(version).flatMap((edit: Json) => edit.delete ?? []))

    const inLicensee = deletedIn(versionBy('D1'))
    const misplaced = new Set([...deletedIn(versionBy('D2'))]
        .filter(id => inLicensee.has(id))
        .filter(id => {
            const symbol = symbols.get(id)
            return symbol ? witnessesOf(symbol).every(name => name === 'S1' || name === 'W') : false
        }))
    if (misplaced.size === 0) return ['C: keine gemeinsamen Tilgungen der beiden Umstanzungen gefunden']

    dropDeletions(misplaced)
    const c = versionBy('C')
    c.motivations.push({
        '@type': 'motivation', '@id': 'treble-crescendo-thinned',
        note: 'Ausgedünntes Crescendo im Diskant'
    })
    editsOf(c).push({
        '@type': 'edit', '@id': randomUUID(),
        editType: 'remove-redundancy',
        motivation: 'treble-crescendo-thinned',
        delete: [...misplaced],
        '@annotation': believing('likely', [argued(
            'Diese Befehle bei 1691–1775, 2582, 2608 und 7444–8037 mm fehlen in Stanford-2, dem Zeugen dieser '
            + 'Fassung, und ebenso in der Licensee- und in der grünen Umstanzung. Getragen werden sie allein von '
            + 'Stanford-1 und vom Exemplar Widuch. Vier von ihnen werden erst durch Bearbeitungen der Fassung B '
            + 'wirkungslos, zwei sind es schon in A.'
        )])
    })
    return [`C: ${misplaced.size} Tilgungen aus D1 und D2 übernommen, die kein Zeuge unterhalb von C trägt`]
}

/**
 * The green version's insertions past the rewind, which are the scanner's
 * sweep across every track and so leave expression symbols as well as notes.
 */
const dropCalibrationSweep = (): string[] => {
    const green = versionBy('D2')
    const sweep = new Set(insertionsOf(green)
        .filter(symbol => (onsetOf(symbol) ?? 0) > REWIND)
        .map(symbol => symbol['@id']))
    dropInsertions(green, sweep)
    dropDeletions(sweep)
    return [`D2: ${sweep.size} Einfügungen hinter dem Rückspulbefehl entfernt (Eichtreppe des Scanners)`]
}

/**
 * What the transfer to the green system still leaves standing.
 *
 * A green machine has no word for a red on-off command, so every one of
 * them left in the version's text is a place where the transfer is
 * unfinished. Ten reach it here because the repairs above put readings
 * back into B and C that the transfer had never seen, and the version
 * inherits them. Each is struck, and where a green hold of the answering
 * function already covers its place, that is what took it over.
 */
const finishTheGreenTransfer = (): string[] => {
    const green = versionBy('D2')
    const readable = new Set(Object.values(GREEN))

    /** The green function that answers a red command, where one does. */
    const answering: Record<string, string> = {
        SlowCrescendo: 'Crescendo', SustainPedal: 'SustainPedal', SoftPedal: 'SoftPedal',
        Mezzoforte: 'Mezzoforte', Forzando: 'SforzandoForte'
    }
    const answerTo = (type: string): string | undefined =>
        answering[type.replace(/(On|Off)$/, '')]

    const snapshot = snapshotOf('D2').filter(symbol => symbol['@type'] === 'expression')
    const holds = snapshot.filter(symbol => readable.has(symbol.expressionType))
    const unreadable = snapshot.filter(symbol => !readable.has(symbol.expressionType))

    const heldOver = (symbol: Json): boolean => {
        const span = spanOf(symbol)
        const wanted = answerTo(symbol.expressionType)
        if (!span || !wanted) return false
        return holds.some(hold => {
            const there = spanOf(hold)
            return hold.expressionType === wanted && hold.scope === symbol.scope && there !== undefined
                && there.from - COLLATION_TOLERANCE <= span.from
                && span.from <= there.to + COLLATION_TOLERANCE
        })
    }

    const answered = unreadable.filter(heldOver)
    const unanswered = unreadable.filter(symbol => !heldOver(symbol))

    const strike = (symbols: Json[], motivation: string) => {
        if (symbols.length === 0) return
        editsOf(green).push({
            '@type': 'edit', '@id': randomUUID(), motivation,
            delete: symbols.map(symbol => symbol['@id'])
        })
    }
    strike(answered, 'latch-to-hold')
    strike(unanswered, 'expression-recoded')

    return [`D2: ${unreadable.length} rote Befehle getilgt, die der T-98 nicht lesen kann`
        + ` (${answered.length} von einer grünen Haltung beantwortet, ${unanswered.length} ohne)`]
}

// ------------------------------------------------------------- explanations

const motivationsOfLicensee: Json[] = [
    {
        '@type': 'motivation', '@id': 'bass-mezzoforte-set',
        note: 'Mezzoforte-Haken im Bass, der die Nuancierung auf den unteren Bereich festlegt'
    },
    {
        '@type': 'motivation', '@id': 'note-repeated',
        note: 'Wiederholter Anschlag des c′ statt eines durchgehaltenen Tons'
    },
    {
        '@type': 'motivation', '@id': 'note-retimed',
        note: 'Das zweite c vorgezogen, das erste dafür verkürzt'
    },
    {
        '@type': 'motivation', '@id': 'soft-pedal-held',
        note: 'Der Pianozug bleibt getreten, die lösende Stanzung fehlt'
    }
]

const motivationsOfGreen: Json[] = [
    {
        '@type': 'motivation', '@id': 'latch-to-hold',
        note: 'Haltende Perforation an Stelle von Ein- und Ausschaltbefehl, wie es die Bahn des T-98 verlangt'
    },
    {
        '@type': 'motivation', '@id': 't98-only-command',
        note: 'Absenkung durch den eigenen Sforzando-piano-Befehl des T-98'
    },
    {
        '@type': 'motivation', '@id': 'expression-recoded',
        note: 'Dynamik für die grüne Bahn neu gelegt'
    },
    {
        '@type': 'motivation', '@id': 'note-text-differs',
        note: 'Abweichender Notentext: ein zusätzliches f′′, ein verschobenes g'
    }
]

const kindOf = (symbol: Json): string =>
    symbol['@type'] === 'note' ? 'note' : String(symbol.expressionType)

const symbolsOf = (edit: Json, symbols: Map<string, Json>): Json[] => [
    ...(edit.insert ?? []),
    ...(edit.delete ?? []).map((id: string) => symbols.get(id)).filter(Boolean)
]

const licenseeMotivationOf = (edit: Json, symbols: Map<string, Json>): string => {
    const kinds = symbolsOf(edit, symbols).map(kindOf)
    if (kinds.includes('SoftPedalOff')) return 'soft-pedal-held'
    if (kinds.every(kind => kind === 'note')) {
        const short = (edit.insert ?? []).some((symbol: Json) => {
            const span = spanOf(symbol)
            return span !== undefined && span.to - span.from < 10
        })
        return short ? 'note-repeated' : 'note-retimed'
    }
    return 'bass-mezzoforte-set'
}

const greenMotivationOf = (edit: Json, symbols: Map<string, Json>): string => {
    if ((edit.insert?.length ?? 0) > 0 && (edit.delete?.length ?? 0) > 0) return 'latch-to-hold'
    const kinds = symbolsOf(edit, symbols).map(kindOf)
    if (kinds.every(kind => kind === 'note')) return 'note-text-differs'
    if (kinds.every(kind => kind === 'SforzandoPiano')) return 't98-only-command'
    return 'expression-recoded'
}

const explain = (
    siglum: string,
    motivations: Json[],
    motivationOf: (edit: Json, symbols: Map<string, Json>) => string
): string[] => {
    const { symbols } = symbolIndex()
    const version = versionBy(siglum)
    version.motivations.push(...motivations)
    editsOf(version)
        .filter((edit: Json) => !edit.motivation)
        .forEach((edit: Json) => { edit.motivation = motivationOf(edit, symbols) })

    const counted = editsOf(version).reduce<Map<string, number>>((tally, edit) => {
        tally.set(edit.motivation, (tally.get(edit.motivation) ?? 0) + 1)
        return tally
    }, new Map())
    return [...counted].map(([id, n]) => `${siglum}: ${n} Edits mit der Begründung „${id}"`)
}

// ------------------------------------------------------------------- the run

const report = [
    ...enrichChase(),
    ...enrichDyer(),
    ...enrichVersionCreation(),
    ...untangleSharedCarriers(),
    ...mergeDuplicateSymbols(),
    ...adoptOrphanPunches(),
    ...recollate(),
    ...liftAncestralRelease(),
    ...relocateSharedDeletions(),
    ...dropCalibrationSweep(),
    ...splitOffStanfordUnicum(),
    ...nameTheWiduchLayer(),
    ...dropDanglingDeletions(),
    ...finishTheGreenTransfer(),
    ...explain('D1', motivationsOfLicensee, licenseeMotivationOf),
    ...explain('D2', motivationsOfGreen, greenMotivationOf)
]

report.forEach(line => console.log('  ' + line))

console.log('\n  Fassungen:')
document.versions.forEach((version: Json) => {
    const snapshot = snapshotOf(version.siglum)
    const bare = editsOf(version).filter((edit: Json) => !edit.motivation && !edit.editType).length
    console.log(`    ${version.siglum.padEnd(3)} ${String(editsOf(version).length).padStart(4)} Edits, `
        + `${String(snapshot.length).padStart(4)} Symbole, ${bare} ohne Begründung`
        + `  [${version.versionType}, ${version.system.name}]`)
})

const validate = new Ajv({ formats: { date: /^\d{4}-\d{1,2}-\d{1,2}$/ } })
    .compile(JSON.parse(readFileSync(SCHEMA, 'utf-8')))

const sound = validate(document)
console.log(`\n  gegen das Schema: ${sound ? 'gültig' : 'UNGÜLTIG'}`)
if (!sound) {
    console.log(JSON.stringify(validate.errors?.slice(0, 5), null, 2))
    console.error('\n  nicht geschrieben: das Ergebnis hält dem Schema nicht stand')
    process.exit(1)
}

if (write) {
    writeFileSync(TARGET, JSON.stringify(document, null, 4))
    console.log(`\n  geschrieben nach ${TARGET.pathname}`)
} else {
    console.log('\n  (nichts geschrieben; --write schreibt nach ../welte225.org/edition.jsonld)')
}
