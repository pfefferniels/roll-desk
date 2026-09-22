import { describe, expect, it } from 'vitest'
import { AnyFeature, Hole, Mark, assignObject, mergeObstacle, mm, track } from 'linked-rolls'
import { mergeObstacleFor, mergeObstacleNote } from './mergeObstacleNote'
import { fixtureEdition, viewOf } from './editionFixture'

const hole = (from: number, position: number, rest: Partial<Hole> = {}): Hole => ({
    type: 'Hole',
    id: `hole-${from}`,
    horizontal: { unit: 'mm', from: mm(from), to: mm(from + 2) },
    vertical: { unit: 'track', from: track(position) },
    ...rest
})

const mark = (from: number, position: number, rest: Partial<Mark> = {}): Mark => ({
    type: 'Mark',
    id: `mark-${from}`,
    horizontal: { unit: 'mm', from: mm(from), to: mm(from + 2) },
    vertical: { unit: 'track', from: track(position) },
    ...rest
})

const torn = assignObject({ type: 'ConditionState', conditionType: 'partially-torn' } as const)
const missing = assignObject({ type: 'ConditionState', conditionType: 'missing-perforation' } as const)

/** A selection per obstacle the library names, so that the notes stay tied to its answers. */
const selections: AnyFeature[][] = [
    [hole(1000, 47)],
    [hole(1000, 47), mark(1010, 47)],
    [hole(1000, 47), hole(1010, 48)],
    [mark(1000, 47), mark(1010, 47, { technique: 'stamp' })],
    [hole(1000, 47, { condition: torn }), hole(1010, 47, { condition: missing })]
]

describe('what stands in the way of merging features', () => {
    it('is nothing where the features differ only in their place', () => {
        expect(mergeObstacle([hole(1000, 47), hole(1010, 47)])).toBeUndefined()
    })

    it('is put in a phrase for every obstacle the library names', () => {
        const obstacles = selections.map(mergeObstacle)
        expect(new Set(obstacles).size).toBe(selections.length)
        expect(obstacles.map(obstacle => mergeObstacleNote(obstacle!))).toEqual([
            'Fewer than two features are selected.',
            'The features are not all of one type.',
            'The features do not lie on the same tracks.',
            'The features differ in more than their place along the roll.',
            'The features state conditions that differ.'
        ])
    })
})

describe('the obstacle the desk asks about before offering a merge', () => {
    /** The fixture's copy, with one more hole added by an act of its own. */
    const withAnAlteration = () => {
        const edition = fixtureEdition()
        const copy = edition.copies[0]
        if (!copy) throw new Error('the fixture has changed')
        copy.modifications.push({ type: 'Alteration', produced: [hole(1100, 47)] })
        return { punched: copy.production?.produced ?? [], altered: [hole(1100, 47)], view: viewOf(edition) }
    }

    it('falls through to the features themselves where they stand in one act', () => {
        const { punched, view } = withAnAlteration()
        expect(mergeObstacleFor([punched[0]!, punched[1]!], view)).toBe('different-tracks')
        expect(mergeObstacleFor([punched[0]!], view)).toBe('fewer-than-two')
    })

    it('is the acts where the features were brought about by different ones', () => {
        const { punched, altered, view } = withAnAlteration()
        expect(mergeObstacleFor([punched[0]!, altered[0]!], view)).toBe('different-acts')
        expect(mergeObstacleNote('different-acts')).toBe('The features were brought about by different acts.')
    })

    it('falls back to the features alone where no view is given', () => {
        expect(mergeObstacleFor([hole(1000, 47), hole(1010, 47)])).toBeUndefined()
    })
})
