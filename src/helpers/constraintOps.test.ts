import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { AnySymbol, Expression, constraintProblems, placementsOf } from 'linked-rolls'
import { fixtureEdition, ids, viewOf } from './editionFixture'
import { pair, place, unpair, unplace } from './constraintOps'

const insertedInA = (edition: ReturnType<typeof fixtureEdition>, id: string): AnySymbol | undefined =>
    edition.versions[0].edits[0].insert?.find(symbol => symbol.id === id)

describe('constraint ops', () => {
    it('state the placement on the follower where it was inserted', () => {
        const edition = fixtureEdition()
        const next = produce(edition, place(viewOf(edition), ids.forzandoOff, ids.note, 'alignedWith'))

        const inserted = insertedInA(next, ids.forzandoOff)
        expect(inserted && 'alignedWith' in inserted ? inserted.alignedWith : undefined)
            .toEqual({ id: ids.note })
        expect(viewOf(next).get<Expression>(ids.forzandoOff)?.alignedWith).toEqual({ id: ids.note })
    })

    it('place one way at most, a new statement taking the place of the old', () => {
        const edition = fixtureEdition()
        const view = viewOf(edition)
        const before = produce(edition, place(view, ids.forzandoOff, ids.note, 'before'))
        const after = produce(before, place(view, ids.forzandoOff, ids.otherNote, 'after'))

        const symbol = viewOf(after).get<Expression>(ids.forzandoOff)
        expect(symbol && placementsOf(symbol)).toEqual([{ relation: 'after', reference: { id: ids.otherNote } }])
        expect(symbol && 'before' in symbol).toBe(false)
    })

    it('take a placement back without leaving a key behind', () => {
        const edition = fixtureEdition()
        const view = viewOf(edition)
        const placed = produce(edition, place(view, ids.forzandoOff, ids.note, 'before'))
        const released = produce(placed, unplace(view, ids.forzandoOff))

        const symbol = viewOf(released).get<Expression>(ids.forzandoOff)
        expect(symbol && placementsOf(symbol)).toEqual([])
        expect(symbol && 'before' in symbol).toBe(false)
    })

    it('state a pair on one side only', () => {
        const edition = fixtureEdition()
        const next = produce(edition, pair(viewOf(edition), ids.forzandoOff, ids.forzandoOn))
        const view = viewOf(next)

        expect(view.get<Expression>(ids.forzandoOff)?.pairedWith).toEqual({ id: ids.forzandoOn })
        expect(view.get<Expression>(ids.forzandoOn)?.pairedWith).toBeUndefined()
    })

    it('take a pair back from the side stating it', () => {
        const edition = fixtureEdition()
        const view = viewOf(edition)
        const paired = produce(edition, pair(view, ids.forzandoOff, ids.forzandoOn))
        const released = produce(paired, unpair(view, ids.forzandoOff))

        const symbol = viewOf(released).get<Expression>(ids.forzandoOff)
        expect(symbol && 'pairedWith' in symbol).toBe(false)
    })

    it('leave the edition as it is for a text symbol or an unknown id', () => {
        const edition = fixtureEdition()
        const view = viewOf(edition)

        expect(produce(edition, place(view, ids.label, ids.note, 'alignedWith'))).toBe(edition)
        expect(produce(edition, pair(view, 'nothing', ids.note))).toBe(edition)
    })

    it('bind every version carrying the perforation, which the checks tell apart', () => {
        const edition = fixtureEdition()
        const next = produce(edition, pair(viewOf(edition), ids.forzandoOff, ids.forzandoOn))

        expect(constraintProblems(viewOf(next))).toEqual([
            { version: ids.b, symbol: ids.forzandoOff, problem: 'partner-missing' }
        ])
    })
})
