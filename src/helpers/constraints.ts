import {
    AnyPerforation, AnySymbol, ConstraintProblem, EditionView, HorizontalSpan,
    NegotiatedEvent, PlacementRelation, Version, idOf, isPerforation, pairsAmong, placementsOf
} from "linked-rolls"

export const perforationsIn = (snapshot: readonly AnySymbol[]): AnyPerforation[] =>
    snapshot.filter(isPerforation)

type ById = ReadonlyMap<string, AnyPerforation>

const indexed = (perforations: readonly AnyPerforation[]): ById =>
    new Map(perforations.map(perforation => [perforation.id, perforation]))

/** A placement both of whose ends the version has. */
export type Placement = { relation: PlacementRelation; follower: AnyPerforation; reference: AnyPerforation }

/** The statement placing a perforation, where the version has its reference. */
const placementOf = (follower: AnyPerforation, known: ById): Placement | undefined => {
    const statement = placementsOf(follower)[0]
    const reference = statement && known.get(idOf(statement.reference))
    return statement && reference ? { relation: statement.relation, follower, reference } : undefined
}

export const placementsIn = (snapshot: readonly AnySymbol[]): Placement[] => {
    const perforations = perforationsIn(snapshot)
    const known = indexed(perforations)
    return perforations.flatMap(follower => {
        const placement = placementOf(follower, known)
        return placement ? [placement] : []
    })
}

/** Whether a perforation makes a placing statement, whether or not its reference is at hand. */
export const isPlaced = (symbol: AnyPerforation): boolean => placementsOf(symbol).length > 0

/** A pair as the format states it: `stating` carries the `pairedWith`. */
export type Pair = { stating: AnyPerforation; partner: AnyPerforation }

export const pairsIn = (snapshot: readonly AnySymbol[]): Pair[] =>
    pairsAmong(perforationsIn(snapshot)).map(([stating, partner]) => ({ stating, partner }))

/**
 * The perforation carrying the statement that binds `symbol` into a
 * pair, whether or not the version has the partner.
 */
export const pairStatementOf = (symbol: AnyPerforation, snapshot: readonly AnySymbol[]): AnyPerforation | undefined =>
    symbol.pairedWith
        ? symbol
        : perforationsIn(snapshot).find(other => other.pairedWith && idOf(other.pairedWith) === symbol.id)

export const partnerOf = (symbol: AnyPerforation, snapshot: readonly AnySymbol[]): AnyPerforation | undefined => {
    const stating = pairStatementOf(symbol, snapshot)
    if (!stating) return undefined
    if (stating.id !== symbol.id) return stating
    return symbol.pairedWith && indexed(perforationsIn(snapshot)).get(idOf(symbol.pairedWith))
}

/** What binds a perforation within a version, both ends present. */
export type Constraints = { placement?: Placement; pairedWith?: AnyPerforation }

export const constraintsOf = (symbol: AnyPerforation, snapshot: readonly AnySymbol[]): Constraints => ({
    placement: placementOf(symbol, indexed(perforationsIn(snapshot))),
    pairedWith: partnerOf(symbol, snapshot)
})

/** The ids a perforation is placed by, one after the other, until the chain ends or turns back on itself. */
export const placementChain = (id: string, snapshot: readonly AnySymbol[]): string[] => {
    const known = indexed(perforationsIn(snapshot))
    const nextOf = (from: string): string | undefined => {
        const symbol = known.get(from)
        const statement = symbol && placementsOf(symbol)[0]
        return statement && idOf(statement.reference)
    }
    const onward = (from: string, followed: readonly string[]): string[] => {
        const next = nextOf(from)
        if (!next) return [...followed]
        return followed.includes(next) ? [...followed] : onward(next, [...followed, next])
    }
    return onward(id, [])
}

export type Displacement = { symbol: AnyPerforation; measured: HorizontalSpan; performed: HorizontalSpan }

/** Where the performance puts a perforation elsewhere than it was measured. */
export const displacedEvents = (
    events: readonly NegotiatedEvent[],
    view: EditionView,
    epsilon = 1e-6
): Displacement[] =>
    events.flatMap(event => {
        const symbol = view.get<AnySymbol>(event.id)
        if (!isPerforation(symbol)) return []
        const measured = view.placeOf(symbol)
        if (!measured || Math.abs(event.horizontal.from - measured.from) <= epsilon) return []
        return [{ symbol, measured, performed: event.horizontal }]
    })

/** How far the performance moves each perforation it moves, in mm, by id. */
export const shiftsIn = (events: readonly NegotiatedEvent[], view: EditionView): ReadonlyMap<string, number> =>
    new Map(
        displacedEvents(events, view)
            .map(({ symbol, measured, performed }): [string, number] => [symbol.id, performed.from - measured.from])
    )

export const perforationLabel = (symbol: AnyPerforation): string =>
    symbol.type === 'note'
        ? `Note ${symbol.pitch}`
        : `${symbol.expressionType} (${symbol.scope})`

export const describePerforation = (symbol: AnyPerforation, view: EditionView): string => {
    const place = view.placeOf(symbol)?.from
    return place === undefined
        ? perforationLabel(symbol)
        : `${perforationLabel(symbol)} at ${place.toFixed(0)} mm`
}

export const relationLabel: Record<PlacementRelation, string> = {
    alignedWith: 'follows',
    before: 'lies before',
    after: 'lies after'
}

export const describePlacement = ({ relation, follower, reference }: Placement, view: EditionView): string =>
    `${describePerforation(follower, view)} ${relationLabel[relation]} ${describePerforation(reference, view)}`

export type ProblemKind = ConstraintProblem['problem']

const problemLabels: Record<ProblemKind, string> = {
    'alignment-reference-missing': 'Aligned with a perforation this version does not have',
    'before-reference-missing': 'Placed before a perforation this version does not have',
    'after-reference-missing': 'Placed after a perforation this version does not have',
    'placed-relative-to-itself': 'Placed relative to itself',
    'placed-several-ways': 'Placed in several ways at once',
    'partner-missing': 'Paired with a perforation this version does not have',
    'paired-with-itself': 'Paired with itself',
    'type-not-on-the-bar': 'A command this version\u2019s system has no word for',
    'carrier-on-another-track': 'Carried by a hole on a track that says something else',
    'copies-disagree-on-the-paper': 'Its copies disagree about the paper the roll ran on',
    'in-several-pairs': 'In more than one pair',
    'pair-placed-on-both-sides': 'Both members of the pair are placed'
}

export const problemLabel = (kind: ProblemKind): string => problemLabels[kind]

export const problemsOfVersion = (problems: readonly ConstraintProblem[], versionId: string): ConstraintProblem[] =>
    problems.filter(problem => problem.version === versionId)

export type VersionProblems = { version: Version; problems: ConstraintProblem[] }

/** The problems under the versions they hold in, in the edition's order, versions without any left out. */
export const problemsByVersion = (
    problems: readonly ConstraintProblem[],
    versions: readonly Version[]
): VersionProblems[] =>
    versions
        .map(version => ({ version, problems: problemsOfVersion(problems, version.id) }))
        .filter(group => group.problems.length > 0)

export const troubledSymbols = (problems: readonly ConstraintProblem[]): ReadonlySet<string> =>
    new Set(problems.map(problem => problem.symbol))

export const problemCount = (count: number): string =>
    `${count} constraint problem${count === 1 ? '' : 's'}`

const alreadyPaired = (symbol: AnyPerforation, snapshot: readonly AnySymbol[]): string | undefined => {
    if (!pairStatementOf(symbol, snapshot)) return undefined
    const partner = partnerOf(symbol, snapshot)
    return partner
        ? `${perforationLabel(symbol)} is already paired with ${perforationLabel(partner)}`
        : `${perforationLabel(symbol)} is already paired`
}

/** Why the two may not be paired, or nothing if they may. */
export const refusalToPair = (one: AnyPerforation, other: AnyPerforation, snapshot: readonly AnySymbol[]): string | undefined =>
    one.id === other.id
        ? 'A perforation cannot be paired with itself'
        : alreadyPaired(one, snapshot) ?? alreadyPaired(other, snapshot)

/**
 * Between an expression and a note, the expression is placed relative
 * to the note. Between two of a kind nothing decides, and the editor
 * is asked.
 */
export const placementBetween = (one: AnyPerforation, other: AnyPerforation, relation: PlacementRelation): Placement | undefined => {
    if (one.type === 'expression' && other.type === 'note') return { relation, follower: one, reference: other }
    if (one.type === 'note' && other.type === 'expression') return { relation, follower: other, reference: one }
    return undefined
}

/** Why the placement may not be stated, or nothing if it may. */
export const refusalToPlace = ({ follower, reference }: Placement, snapshot: readonly AnySymbol[]): string | undefined => {
    if (follower.id === reference.id) return 'A perforation cannot be placed relative to itself'
    if (follower.type === 'note' && reference.type === 'expression') {
        return 'A note is not placed relative to an expression: expressions follow notes'
    }
    if (placementChain(reference.id, snapshot).includes(follower.id)) {
        return `${perforationLabel(reference)} is already placed relative to ${perforationLabel(follower)}, so the statement would run in a circle`
    }
    const partner = partnerOf(follower, snapshot)
    if (partner && isPlaced(partner)) {
        return `Its partner ${perforationLabel(partner)} is already placed, and a pair follows one reference only`
    }
    return undefined
}
