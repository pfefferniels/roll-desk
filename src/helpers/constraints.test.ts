import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { AnyCommand, EditionOp, constraintProblems, isCommand, mm, pairCommands, placeCommand, symbolIn, snapshotOf, Edition } from 'linked-rolls'
import { fixtureEdition, ids } from './editionFixture'
import {
    ProblemKind, constraintsOf, describeCommand, describePlacement, displacedEvents,
    pairStatementOf, pairsIn, partnerOf, commandsIn, placementBetween, placementChain,
    placementsIn, problemLabel, problemsByVersion, refusalToPair, refusalToPlace, shiftsIn
} from './constraints'
import { negotiatedEventOf, welteT100 } from 'linked-rolls'

/** The one item a list should hold, so a wrong count fails here and says which. */
const only = <T>(items: readonly T[]): T => {
    expect(items).toHaveLength(1)
    const [first] = items
    if (!first) throw new Error('expected exactly one item, found none')
    return first
}

/** The first item, where the test has already said how many there are. */
const first = <T>(items: readonly T[]): T => {
    const [head] = items
    if (!head) throw new Error('expected at least one item, found none')
    return head
}


type Arrangement = () => EditionOp[]

/** The fixture with the given statements made. */
const arranged = (arrange: Arrangement): Edition =>
    arrange().reduce((state, op) => produce(state, op), fixtureEdition())

const command = (edition: Edition, id: string): AnyCommand => {
    const symbol = symbolIn(edition, id)
    if (!isCommand(symbol)) throw new Error(`no command ${id}`)
    return symbol
}

describe('placements of a version', () => {
    it('list a placement both of whose ends the version has, with its relation', () => {
        const edition = arranged(() => [placeCommand(ids.forzandoOff, ids.note, 'alignedWith')])
        const placement = only(placementsIn(snapshotOf(edition, ids.b)))
        expect(placement.relation).toBe('alignedWith')
        expect(placement.follower.id).toBe(ids.forzandoOff)
        expect(placement.reference.id).toBe(ids.note)
    })

    it('list an order the same way', () => {
        const edition = arranged(() => [placeCommand(ids.forzandoOn, ids.note, 'before')])
        expect(placementsIn(snapshotOf(edition, ids.a)).map(p => [p.relation, p.follower.id]))
            .toEqual([['before', ids.forzandoOn]])
    })

    it('leave out a placement whose reference the version does not have', () => {
        const edition = arranged(() => [placeCommand(ids.forzandoOff, ids.forzandoOn, 'after')])
        expect(placementsIn(snapshotOf(edition, ids.a))).toHaveLength(1)
        expect(placementsIn(snapshotOf(edition, ids.b))).toEqual([])
    })
})

describe('pairs of a version', () => {
    it('are found from either side', () => {
        const edition = arranged(() => [pairCommands(ids.forzandoOff, ids.forzandoOn)])
        const snapshot = snapshotOf(edition, ids.a)
        const off = command(edition, ids.forzandoOff)
        const on = command(edition, ids.forzandoOn)

        expect(pairsIn(snapshot).map(p => [p.stating.id, p.partner.id]))
            .toEqual([[ids.forzandoOff, ids.forzandoOn]])
        expect(pairStatementOf(on, snapshot)?.id).toBe(ids.forzandoOff)
        expect(partnerOf(off, snapshot)?.id).toBe(ids.forzandoOn)
        expect(partnerOf(on, snapshot)?.id).toBe(ids.forzandoOff)
    })

    it('keep the statement but lose the partner where the version lacks it', () => {
        const edition = arranged(() => [pairCommands(ids.forzandoOff, ids.forzandoOn)])
        const snapshot = snapshotOf(edition, ids.b)
        const off = command(edition, ids.forzandoOff)

        expect(pairsIn(snapshot)).toEqual([])
        expect(pairStatementOf(off, snapshot)?.id).toBe(ids.forzandoOff)
        expect(partnerOf(off, snapshot)).toBeUndefined()
    })
})

describe('what binds a command', () => {
    it('names the placement and the partner', () => {
        const edition = arranged(() => [
            placeCommand(ids.forzandoOff, ids.note, 'before'),
            pairCommands(ids.forzandoOn, ids.forzandoOff)
        ])
        const bound = constraintsOf(command(edition, ids.forzandoOff), snapshotOf(edition, ids.a))
        expect(bound.placement?.relation).toBe('before')
        expect(bound.placement?.reference.id).toBe(ids.note)
        expect(bound.pairedWith?.id).toBe(ids.forzandoOn)
    })

    it('follows a chain of placements to its end', () => {
        const edition = arranged(() => [
            placeCommand(ids.forzandoOn, ids.forzandoOff, 'before'),
            placeCommand(ids.forzandoOff, ids.note, 'alignedWith')
        ])
        expect(placementChain(ids.forzandoOn, snapshotOf(edition, ids.a)))
            .toEqual([ids.forzandoOff, ids.note])
    })

    it('stops where a chain turns back on itself', () => {
        const edition = arranged(() => [
            placeCommand(ids.forzandoOn, ids.forzandoOff, 'alignedWith'),
            placeCommand(ids.forzandoOff, ids.forzandoOn, 'after')
        ])
        expect(placementChain(ids.forzandoOn, snapshotOf(edition, ids.a)))
            .toEqual([ids.forzandoOff, ids.forzandoOn])
    })
})

describe('displaced events', () => {
    /** The fixture performed with the forzando off moved 4 mm back. */
    const performance = () => {
        const edition = fixtureEdition()
        const events = commandsIn(snapshotOf(edition, ids.a))
            .flatMap(symbol => {
                const event = negotiatedEventOf(edition, symbol, welteT100)
                return event ? [event] : []
            })
        const performed = events.map(event => event.id === ids.forzandoOff
            ? { ...event, horizontal: { ...event.horizontal, from: mm(1000), to: mm(1002) } }
            : event
        )
        return { edition, performed }
    }

    it('are reported with both places', () => {
        const { edition, performed } = performance()
        const displacement = only(displacedEvents(performed, edition))
        expect(displacement.symbol.id).toBe(ids.forzandoOff)
        expect(displacement.measured.from).toBe(1004)
        expect(displacement.performed.from).toBe(1000)
    })

    it('give the shift of each moved command by id', () => {
        const { edition, performed } = performance()
        expect(Array.from(shiftsIn(performed, edition))).toEqual([[ids.forzandoOff, -4]])
    })
})

describe('descriptions', () => {
    it('name a command by its kind and place', () => {
        const edition = fixtureEdition()
        expect(describeCommand(command(edition, ids.note), edition)).toBe('Note 60 at 1000 mm')
        expect(describeCommand(command(edition, ids.forzandoOff), edition)).toBe('ForzandoOff (treble) at 1004 mm')
    })

    it('put a placement into words', () => {
        const edition = arranged(() => [placeCommand(ids.forzandoOn, ids.note, 'before')])
        const placement = first(placementsIn(snapshotOf(edition, ids.a)))
        expect(describePlacement(placement, edition)).toBe('ForzandoOn (treble) at 990 mm lies before Note 60 at 1000 mm')
    })

    it('put every kind of problem into different words', () => {
        const kinds: ProblemKind[] = [
            'alignment-reference-missing', 'before-reference-missing', 'after-reference-missing',
            'placed-relative-to-itself', 'placed-several-ways',
            'partner-missing', 'paired-with-itself', 'in-several-pairs', 'pair-placed-on-both-sides'
        ]
        expect(new Set(kinds.map(problemLabel)).size).toBe(kinds.length)
    })
})

describe('problems by version', () => {
    it('groups them under the versions they hold in, leaving out the sound ones', () => {
        const edition = arranged(() => [pairCommands(ids.forzandoOff, ids.forzandoOn)])
        const groups = problemsByVersion(constraintProblems(edition), edition.versions)
        expect(groups.map(group => group.version.id)).toEqual([ids.b])
        expect(first(groups).problems).toEqual([
            { version: ids.b, symbol: ids.forzandoOff, problem: 'partner-missing' }
        ])
    })
})

describe('refusals', () => {
    it('refuse to pair a command with itself or into a second pair', () => {
        const edition = arranged(() => [pairCommands(ids.forzandoOff, ids.forzandoOn)])
        const snapshot = snapshotOf(edition, ids.a)
        const at = (id: string) => command(edition, id)

        expect(refusalToPair(at(ids.note), at(ids.note), snapshot)).toMatch(/itself/)
        expect(refusalToPair(at(ids.note), at(ids.forzandoOn), snapshot)).toMatch(/already paired with/)
        expect(refusalToPair(at(ids.forzandoOff), at(ids.note), snapshot)).toMatch(/already paired with/)
        expect(refusalToPair(at(ids.note), at(ids.otherNote), snapshot)).toBeUndefined()
    })

    it('refuse a placement relative to itself, in a circle, of a note after an expression, or on both sides of a pair', () => {
        const edition = arranged(() => [
            placeCommand(ids.otherNote, ids.note, 'before'),
            placeCommand(ids.forzandoOff, ids.note, 'alignedWith'),
            pairCommands(ids.forzandoOn, ids.forzandoOff)
        ])
        const snapshot = snapshotOf(edition, ids.a)
        const placing = (follower: string, reference: string) => refusalToPlace(
            { relation: 'after', follower: command(edition, follower), reference: command(edition, reference) },
            snapshot
        )

        expect(placing(ids.note, ids.note)).toMatch(/itself/)
        expect(placing(ids.note, ids.otherNote)).toMatch(/circle/)
        expect(placing(ids.note, ids.forzandoOff)).toMatch(/expressions follow notes/)
        expect(placing(ids.forzandoOn, ids.otherNote)).toMatch(/partner/)
        expect(placing(ids.forzandoOff, ids.otherNote)).toBeUndefined()
    })
})

describe('the direction of a placement', () => {
    it('is decided between an expression and a note, whichever was picked first', () => {
        const edition = fixtureEdition()
        const note = command(edition, ids.note)
        const off = command(edition, ids.forzandoOff)

        expect(placementBetween(off, note, 'before')).toEqual({ relation: 'before', follower: off, reference: note })
        expect(placementBetween(note, off, 'after')).toEqual({ relation: 'after', follower: off, reference: note })
    })

    it('is left open between two of a kind', () => {
        const edition = fixtureEdition()
        expect(placementBetween(command(edition, ids.note), command(edition, ids.otherNote), 'alignedWith')).toBeUndefined()
        expect(placementBetween(command(edition, ids.forzandoOn), command(edition, ids.forzandoOff), 'before')).toBeUndefined()
    })
})
