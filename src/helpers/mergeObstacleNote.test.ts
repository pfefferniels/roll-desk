import { describe, expect, it } from 'vitest'
import { AnyFeature, Hole, Mark, assignObject, mergeObstacle, mm, track } from 'linked-rolls'
import { mergeObstacleNote } from './mergeObstacleNote'

const hole = (from: number, position: number, rest: Partial<Hole> = {}): Hole => ({
    type: 'Hole',
    id: `hole-${from}`,
    horizontal: { unit: 'mm', from: mm(from), to: mm(from + 2) },
    vertical: { unit: 'track', from: track(position) },
    ...rest
})

const mark = (from: number, position: number): Mark => ({
    type: 'Mark',
    id: `mark-${from}`,
    horizontal: { unit: 'mm', from: mm(from), to: mm(from + 2) },
    vertical: { unit: 'track', from: track(position) }
})

const torn = assignObject({ type: 'ConditionState', conditionType: 'partially-torn' } as const)
const missing = assignObject({ type: 'ConditionState', conditionType: 'missing-perforation' } as const)

/** A selection per obstacle the library names, so that the notes stay tied to its answers. */
const selections: AnyFeature[][] = [
    [hole(1000, 47)],
    [hole(1000, 47), mark(1010, 47)],
    [hole(1000, 47), hole(1010, 48)],
    [hole(1000, 47), hole(1010, 47, { pattern: 'staggering' })],
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
