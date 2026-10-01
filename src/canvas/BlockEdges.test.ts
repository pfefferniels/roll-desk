import { describe, expect, it } from 'vitest'
import { welteT100 } from 'linked-rolls'
import { svg } from './units'
import { draggedLane } from './BlockEdges'

const [bass, notes, treble] = welteT100.areas as [typeof welteT100.areas[number], typeof welteT100.areas[number], typeof welteT100.areas[number]]

describe('dragging the edge of a block', () => {
    it('grows the block by as much as its bottom edge is dragged down', () => {
        // ten lanes of 10 grown by 20 are ten lanes of 12
        expect(draggedLane(bass, 'bottom', svg(10), 20)).toBe(12)
    })

    it('grows the block by as much as its top edge is dragged up', () => {
        expect(draggedLane(treble, 'top', svg(10), -20)).toBe(12)
        expect(draggedLane(treble, 'top', svg(10), 20)).toBe(8)
    })

    it('shares the change out among all of the keyboard\'s lanes', () => {
        expect(draggedLane(notes, 'bottom', svg(1), 40)).toBe(1.5)
    })

    it('keeps a lane from vanishing or swallowing the drawing', () => {
        expect(draggedLane(notes, 'bottom', svg(1), -1000)).toBe(0.5)
        expect(draggedLane(treble, 'top', svg(10), -10000)).toBe(40)
        expect(draggedLane(bass, 'bottom', svg(10), -1000)).toBe(2)
    })
})
