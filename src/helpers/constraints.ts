import {
    AnyCommand, AnySymbol, ConstraintProblem, EditionView, HorizontalSpan, Millimeters,
    NegotiatedEvent, PlacementRelation, Version, idOf, isCommand, pairsAmong, placementsOf, subtract
} from "linked-rolls"

export const commandsIn = (snapshot: readonly AnySymbol[]): AnyCommand[] =>
    snapshot.filter(isCommand)

type ById = ReadonlyMap<string, AnyCommand>

const indexed = (commands: readonly AnyCommand[]): ById =>
    new Map(commands.map(command => [command.id, command]))

/** A placement both of whose ends the version has. */
export type Placement = { relation: PlacementRelation; follower: AnyCommand; reference: AnyCommand }

/** The statement placing a command, where the version has its reference. */
const placementOf = (follower: AnyCommand, known: ById): Placement | undefined => {
    const statement = placementsOf(follower)[0]
    const reference = statement && known.get(idOf(statement.reference))
    return statement && reference ? { relation: statement.relation, follower, reference } : undefined
}

export const placementsIn = (snapshot: readonly AnySymbol[]): Placement[] => {
    const commands = commandsIn(snapshot)
    const known = indexed(commands)
    return commands.flatMap(follower => {
        const placement = placementOf(follower, known)
        return placement ? [placement] : []
    })
}

/** Whether a command makes a placing statement, whether or not its reference is at hand. */
export const isPlaced = (symbol: AnyCommand): boolean => placementsOf(symbol).length > 0

/** A pair as the format states it: `stating` carries the `pairedWith`. */
export type Pair = { stating: AnyCommand; partner: AnyCommand }

export const pairsIn = (snapshot: readonly AnySymbol[]): Pair[] =>
    pairsAmong(commandsIn(snapshot)).map(([stating, partner]) => ({ stating, partner }))

/**
 * The command carrying the statement that binds `symbol` into a
 * pair, whether or not the version has the partner.
 */
export const pairStatementOf = (symbol: AnyCommand, snapshot: readonly AnySymbol[]): AnyCommand | undefined =>
    symbol.pairedWith
        ? symbol
        : commandsIn(snapshot).find(other => other.pairedWith && idOf(other.pairedWith) === symbol.id)

export const partnerOf = (symbol: AnyCommand, snapshot: readonly AnySymbol[]): AnyCommand | undefined => {
    const stating = pairStatementOf(symbol, snapshot)
    if (!stating) return undefined
    if (stating.id !== symbol.id) return stating
    return symbol.pairedWith && indexed(commandsIn(snapshot)).get(idOf(symbol.pairedWith))
}

/** What binds a command within a version, both ends present. */
export type Constraints = { placement?: Placement; pairedWith?: AnyCommand }

export const constraintsOf = (symbol: AnyCommand, snapshot: readonly AnySymbol[]): Constraints => ({
    placement: placementOf(symbol, indexed(commandsIn(snapshot))),
    pairedWith: partnerOf(symbol, snapshot)
})

/** The ids a command is placed by, one after the other, until the chain ends or turns back on itself. */
export const placementChain = (id: string, snapshot: readonly AnySymbol[]): string[] => {
    const known = indexed(commandsIn(snapshot))
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

export type Displacement = { symbol: AnyCommand; measured: HorizontalSpan; performed: HorizontalSpan }

/** Where the performance puts a command elsewhere than it was measured. */
export const displacedEvents = (
    events: readonly NegotiatedEvent[],
    view: EditionView,
    epsilon = 1e-6
): Displacement[] =>
    events.flatMap(event => {
        const symbol = view.get<AnySymbol>(event.id)
        if (!isCommand(symbol)) return []
        const measured = view.placeOf(symbol)
        if (!measured || Math.abs(event.horizontal.from - measured.from) <= epsilon) return []
        return [{ symbol, measured, performed: event.horizontal }]
    })

/** How far the performance moves each command it moves, by id. */
export const shiftsIn = (events: readonly NegotiatedEvent[], view: EditionView): ReadonlyMap<string, Millimeters> =>
    new Map(
        displacedEvents(events, view)
            .map(({ symbol, measured, performed }): [string, Millimeters] =>
                [symbol.id, subtract(performed.from, measured.from)])
    )

export const commandLabel = (symbol: AnyCommand): string =>
    symbol.type === 'note'
        ? `Note ${symbol.pitch}`
        : `${symbol.expressionType} (${symbol.scope})`

export const describeCommand = (symbol: AnyCommand, view: EditionView): string => {
    const place = view.placeOf(symbol)?.from
    return place === undefined
        ? commandLabel(symbol)
        : `${commandLabel(symbol)} at ${place.toFixed(0)} mm`
}

export const relationLabel: Record<PlacementRelation, string> = {
    alignedWith: 'follows',
    before: 'lies before',
    after: 'lies after'
}

export const describePlacement = ({ relation, follower, reference }: Placement, view: EditionView): string =>
    `${describeCommand(follower, view)} ${relationLabel[relation]} ${describeCommand(reference, view)}`

export type ProblemKind = ConstraintProblem['problem']

const problemLabels: Record<ProblemKind, string> = {
    'alignment-reference-missing': 'Aligned with a command this version does not have',
    'before-reference-missing': 'Placed before a command this version does not have',
    'after-reference-missing': 'Placed after a command this version does not have',
    'placed-relative-to-itself': 'Placed relative to itself',
    'placed-several-ways': 'Placed in several ways at once',
    'partner-missing': 'Paired with a command this version does not have',
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

const alreadyPaired = (symbol: AnyCommand, snapshot: readonly AnySymbol[]): string | undefined => {
    if (!pairStatementOf(symbol, snapshot)) return undefined
    const partner = partnerOf(symbol, snapshot)
    return partner
        ? `${commandLabel(symbol)} is already paired with ${commandLabel(partner)}`
        : `${commandLabel(symbol)} is already paired`
}

/** Why the two may not be paired, or nothing if they may. */
export const refusalToPair = (one: AnyCommand, other: AnyCommand, snapshot: readonly AnySymbol[]): string | undefined =>
    one.id === other.id
        ? 'A command cannot be paired with itself'
        : alreadyPaired(one, snapshot) ?? alreadyPaired(other, snapshot)

/**
 * Between an expression and a note, the expression is placed relative
 * to the note. Between two of a kind nothing decides, and the editor
 * is asked.
 */
export const placementBetween = (one: AnyCommand, other: AnyCommand, relation: PlacementRelation): Placement | undefined => {
    if (one.type === 'expression' && other.type === 'note') return { relation, follower: one, reference: other }
    if (one.type === 'note' && other.type === 'expression') return { relation, follower: other, reference: one }
    return undefined
}

/** Why the placement may not be stated, or nothing if it may. */
export const refusalToPlace = ({ follower, reference }: Placement, snapshot: readonly AnySymbol[]): string | undefined => {
    if (follower.id === reference.id) return 'A command cannot be placed relative to itself'
    if (follower.type === 'note' && reference.type === 'expression') {
        return 'A note is not placed relative to an expression: expressions follow notes'
    }
    if (placementChain(reference.id, snapshot).includes(follower.id)) {
        return `${commandLabel(reference)} is already placed relative to ${commandLabel(follower)}, so the statement would run in a circle`
    }
    const partner = partnerOf(follower, snapshot)
    if (partner && isPlaced(partner)) {
        return `Its partner ${commandLabel(partner)} is already placed, and a pair follows one reference only`
    }
    return undefined
}
