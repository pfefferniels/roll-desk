import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { AnyPerforation, AnySymbol, EditionOp, EditionView, constraintProblems, isPerforation, mm, pairPerforations, placePerforation } from 'linked-rolls'
import { fixtureEdition, ids, viewOf } from './editionFixture'
import {
    ProblemKind, constraintsOf, describePerforation, describePlacement, displacedEvents,
    pairStatementOf, pairsIn, partnerOf, perforationsIn, placementBetween, placementChain,
    placementsIn, problemLabel, problemsByVersion, refusalToPair, refusalToPlace, shiftsIn
} from './constraints'
import { welteT100 } from 'linked-rolls'

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


type Arrangement = (view: EditionView) => EditionOp[]

/** The fixture with the given statements made, as a view. */
const arranged = (arrange: Arrangement): EditionView => {
    const edition = fixtureEdition()
    const view = viewOf(edition)
    return viewOf(arrange(view).reduce((state, op) => produce(state, op), edition))
}

const perforation = (view: EditionView, id: string): AnyPerforation => {
    const symbol = view.get<AnySymbol>(id)
    if (!isPerforation(symbol)) throw new Error(`no perforation ${id}`)
    return symbol
}

describe('placements of a version', () => {
    it('list a placement both of whose ends the version has, with its relation', () => {
        const view = arranged(v => [placePerforation(v, ids.forzandoOff, ids.note, 'alignedWith')])
        const placement = only(placementsIn(view.snapshot(ids.b)))
        expect(placement.relation).toBe('alignedWith')
        expect(placement.follower.id).toBe(ids.forzandoOff)
        expect(placement.reference.id).toBe(ids.note)
    })

    it('list an order the same way', () => {
        const view = arranged(v => [placePerforation(v, ids.forzandoOn, ids.note, 'before')])
        expect(placementsIn(view.snapshot(ids.a)).map(p => [p.relation, p.follower.id]))
            .toEqual([['before', ids.forzandoOn]])
    })

    it('leave out a placement whose reference the version does not have', () => {
        const view = arranged(v => [placePerforation(v, ids.forzandoOff, ids.forzandoOn, 'after')])
        expect(placementsIn(view.snapshot(ids.a))).toHaveLength(1)
        expect(placementsIn(view.snapshot(ids.b))).toEqual([])
    })
})

describe('pairs of a version', () => {
    it('are found from either side', () => {
        const view = arranged(v => [pairPerforations(v, ids.forzandoOff, ids.forzandoOn)])
        const snapshot = view.snapshot(ids.a)
        const off = perforation(view, ids.forzandoOff)
        const on = perforation(view, ids.forzandoOn)

        expect(pairsIn(snapshot).map(p => [p.stating.id, p.partner.id]))
            .toEqual([[ids.forzandoOff, ids.forzandoOn]])
        expect(pairStatementOf(on, snapshot)?.id).toBe(ids.forzandoOff)
        expect(partnerOf(off, snapshot)?.id).toBe(ids.forzandoOn)
        expect(partnerOf(on, snapshot)?.id).toBe(ids.forzandoOff)
    })

    it('keep the statement but lose the partner where the version lacks it', () => {
        const view = arranged(v => [pairPerforations(v, ids.forzandoOff, ids.forzandoOn)])
        const snapshot = view.snapshot(ids.b)
        const off = perforation(view, ids.forzandoOff)

        expect(pairsIn(snapshot)).toEqual([])
        expect(pairStatementOf(off, snapshot)?.id).toBe(ids.forzandoOff)
        expect(partnerOf(off, snapshot)).toBeUndefined()
    })
})

describe('what binds a perforation', () => {
    it('names the placement and the partner', () => {
        const view = arranged(v => [
            placePerforation(v, ids.forzandoOff, ids.note, 'before'),
            pairPerforations(v, ids.forzandoOn, ids.forzandoOff)
        ])
        const bound = constraintsOf(perforation(view, ids.forzandoOff), view.snapshot(ids.a))
        expect(bound.placement?.relation).toBe('before')
        expect(bound.placement?.reference.id).toBe(ids.note)
        expect(bound.pairedWith?.id).toBe(ids.forzandoOn)
    })

    it('follows a chain of placements to its end', () => {
        const view = arranged(v => [
            placePerforation(v, ids.forzandoOn, ids.forzandoOff, 'before'),
            placePerforation(v, ids.forzandoOff, ids.note, 'alignedWith')
        ])
        expect(placementChain(ids.forzandoOn, view.snapshot(ids.a)))
            .toEqual([ids.forzandoOff, ids.note])
    })

    it('stops where a chain turns back on itself', () => {
        const view = arranged(v => [
            placePerforation(v, ids.forzandoOn, ids.forzandoOff, 'alignedWith'),
            placePerforation(v, ids.forzandoOff, ids.forzandoOn, 'after')
        ])
        expect(placementChain(ids.forzandoOn, view.snapshot(ids.a)))
            .toEqual([ids.forzandoOff, ids.forzandoOn])
    })
})

describe('displaced events', () => {
    /** The fixture performed with the forzando off moved 4 mm back. */
    const performance = () => {
        const view = viewOf(fixtureEdition())
        const events = perforationsIn(view.snapshot(ids.a))
            .flatMap(symbol => {
                const event = view.simplifySymbol(symbol, welteT100)
                return event ? [event] : []
            })
        const performed = events.map(event => event.id === ids.forzandoOff
            ? { ...event, horizontal: { ...event.horizontal, from: mm(1000), to: mm(1002) } }
            : event
        )
        return { view, performed }
    }

    it('are reported with both places', () => {
        const { view, performed } = performance()
        const displacement = only(displacedEvents(performed, view))
        expect(displacement.symbol.id).toBe(ids.forzandoOff)
        expect(displacement.measured.from).toBe(1004)
        expect(displacement.performed.from).toBe(1000)
    })

    it('give the shift of each moved perforation by id', () => {
        const { view, performed } = performance()
        expect(Array.from(shiftsIn(performed, view))).toEqual([[ids.forzandoOff, -4]])
    })
})

describe('descriptions', () => {
    it('name a perforation by its kind and place', () => {
        const view = viewOf(fixtureEdition())
        expect(describePerforation(perforation(view, ids.note), view)).toBe('Note 60 at 1000 mm')
        expect(describePerforation(perforation(view, ids.forzandoOff), view)).toBe('ForzandoOff (treble) at 1004 mm')
    })

    it('put a placement into words', () => {
        const view = arranged(v => [placePerforation(v, ids.forzandoOn, ids.note, 'before')])
        const placement = first(placementsIn(view.snapshot(ids.a)))
        expect(describePlacement(placement, view)).toBe('ForzandoOn (treble) at 990 mm lies before Note 60 at 1000 mm')
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
        const view = arranged(v => [pairPerforations(v, ids.forzandoOff, ids.forzandoOn)])
        const groups = problemsByVersion(constraintProblems(view), view.edition.versions)
        expect(groups.map(group => group.version.siglum)).toEqual([ids.b])
        expect(first(groups).problems).toEqual([
            { version: ids.b, symbol: ids.forzandoOff, problem: 'partner-missing' }
        ])
    })
})

describe('refusals', () => {
    it('refuse to pair a perforation with itself or into a second pair', () => {
        const view = arranged(v => [pairPerforations(v, ids.forzandoOff, ids.forzandoOn)])
        const snapshot = view.snapshot(ids.a)
        const at = (id: string) => perforation(view, id)

        expect(refusalToPair(at(ids.note), at(ids.note), snapshot)).toMatch(/itself/)
        expect(refusalToPair(at(ids.note), at(ids.forzandoOn), snapshot)).toMatch(/already paired with/)
        expect(refusalToPair(at(ids.forzandoOff), at(ids.note), snapshot)).toMatch(/already paired with/)
        expect(refusalToPair(at(ids.note), at(ids.otherNote), snapshot)).toBeUndefined()
    })

    it('refuse a placement relative to itself, in a circle, of a note after an expression, or on both sides of a pair', () => {
        const view = arranged(v => [
            placePerforation(v, ids.otherNote, ids.note, 'before'),
            placePerforation(v, ids.forzandoOff, ids.note, 'alignedWith'),
            pairPerforations(v, ids.forzandoOn, ids.forzandoOff)
        ])
        const snapshot = view.snapshot(ids.a)
        const placing = (follower: string, reference: string) => refusalToPlace(
            { relation: 'after', follower: perforation(view, follower), reference: perforation(view, reference) },
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
        const view = viewOf(fixtureEdition())
        const note = perforation(view, ids.note)
        const off = perforation(view, ids.forzandoOff)

        expect(placementBetween(off, note, 'before')).toEqual({ relation: 'before', follower: off, reference: note })
        expect(placementBetween(note, off, 'after')).toEqual({ relation: 'after', follower: off, reference: note })
    })

    it('is left open between two of a kind', () => {
        const view = viewOf(fixtureEdition())
        expect(placementBetween(perforation(view, ids.note), perforation(view, ids.otherNote), 'alignedWith')).toBeUndefined()
        expect(placementBetween(perforation(view, ids.forzandoOn), perforation(view, ids.forzandoOff), 'before')).toBeUndefined()
    })
})
