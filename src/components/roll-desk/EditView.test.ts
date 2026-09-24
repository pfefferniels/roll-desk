import { describe, expect, it } from 'vitest'
import { AnySymbol, CollationTolerance, Edit, editTypes, mm, Note } from 'linked-rolls'
import { arrowId, beliefMarkAt, editTypeLabel, endOf, endsThatMoved, hullId, Stretch, stretchOf } from './EditView'
import { svg } from '../../helpers/units'

const note = (id: string): Note => ({ type: 'note', id, pitch: 60, carriers: [] })

const edit = (parts: Partial<Edit>): Edit => ({ type: 'edit', id: 'edit-1', ...parts })

const stretch = (from: number, to: number): Stretch => ({ from: mm(from), to: mm(to) })

describe('the word written under an edit', () => {
    it('is left out where there is no type to write', () => {
        expect(editTypeLabel(undefined)).toBeUndefined()
    })

    it('is a sign of its own for an accent and a correction', () => {
        expect(editTypeLabel('additional-accent')).toBe('>')
        expect(editTypeLabel('correct-error')).toBe('fix')
    })

    it('is left out for a shift, which the arrow already tells', () => {
        expect(editTypeLabel('shift')).toBeUndefined()
    })

    it('is otherwise the name of the type, read as words', () => {
        expect(editTypeLabel('add-redundancy')).toBe('add redundancy')
    })

    /** A transfer is made of recodings, so writing the word under each would bury the text. */
    it('is left out for a recoding, which the transfer already tells', () => {
        expect(editTypeLabel('recoding')).toBeUndefined()
    })

    it('is given for every type the library knows, the shift and the recoding apart', () => {
        const unlabelled = editTypes.filter(editType => !editTypeLabel(editType))

        expect(unlabelled).toEqual(['recoding', 'shift'])
    })
})

describe('the id a hull is drawn under', () => {
    it('is the edit itself where the edit only inserts', () => {
        expect(hullId(edit({ insert: [note('a')] }), 'insert')).toBe('edit-1')
    })

    it('is the edit itself where the edit only deletes', () => {
        expect(hullId(edit({ delete: ['a'] }), 'delete')).toBe('edit-1')
    })

    it('tells the two hulls apart where the edit does both', () => {
        const replacement = edit({ insert: [note('a')], delete: ['b'] })

        expect(hullId(replacement, 'insert')).toBe('edit-1-insert')
        expect(hullId(replacement, 'delete')).toBe('edit-1-delete')
    })
})

describe('the stretch of roll a set of symbols covers', () => {
    const placing = (places: Record<string, [number, number]>) => ({
        placeOf: (symbol: AnySymbol) => {
            const place = places[symbol.id]
            return place && { unit: 'mm' as const, from: mm(place[0]), to: mm(place[1]) }
        }
    })

    it('runs from the first onset to the last offset', () => {
        const view = placing({ a: [100, 120], b: [90, 110] })

        expect(stretchOf([note('a'), note('b')], view)).toEqual({ from: 90, to: 120 })
    })

    it('is nothing where none of them has a place', () => {
        expect(stretchOf([note('a')], placing({}))).toBeUndefined()
    })
})

/**
 * The tolerance says what the collation would have overlooked, so an end
 * that differs by more than it is an end the edit has something to say
 * about. These are the values the edition of WM 225 collates at.
 */
const tolerance: CollationTolerance = { toleranceStart: mm(3.5), toleranceEnd: mm(5) }

describe('the ends of an edit that moved', () => {
    it('are neither where both stayed within the tolerance', () => {
        expect(endsThatMoved(stretch(100, 120), stretch(103, 124), tolerance)).toEqual([])
    })

    it('are the onset alone where the command moved and kept its length', () => {
        expect(endsThatMoved(stretch(100, 120), stretch(115, 135), tolerance)).toEqual(['onset'])
    })

    it('are the offset alone where the command was prolonged', () => {
        expect(endsThatMoved(stretch(100, 120), stretch(100, 140), tolerance)).toEqual(['offset'])
    })

    it('are the onset alone where it begins earlier and ends where it did', () => {
        expect(endsThatMoved(stretch(100, 120), stretch(80, 120), tolerance)).toEqual(['onset'])
    })

    it('are both where the command moved and changed its length', () => {
        expect(endsThatMoved(stretch(100, 120), stretch(115, 160), tolerance)).toEqual(['onset', 'offset'])
    })

    it('are none where one of the two has no place', () => {
        expect(endsThatMoved(undefined, stretch(100, 120), tolerance)).toEqual([])
    })

    /**
     * A window measured from the readings is centred on the displacement
     * between the two copies, so what it overlooks is not what a window
     * about zero would overlook.
     */
    describe('against a window centred away from zero', () => {
        const displaced: CollationTolerance = {
            ...tolerance,
            offsetStart: mm(-3),
            offsetEnd: mm(-3)
        }

        it('are neither where the command sits where the offset puts it', () => {
            expect(endsThatMoved(stretch(100, 120), stretch(96, 116), displaced)).toEqual([])
        })

        it('are the onset where a window about zero would have overlooked it', () => {
            expect(endsThatMoved(stretch(100, 120), stretch(101, 121), displaced)).toEqual(['onset'])
        })
    })
})

describe('the box an arrow about one end joins', () => {
    const command = { x: svg(10), y: svg(40), width: svg(30), height: svg(3) }

    it('sits at the onset, with no width of its own', () => {
        expect(endOf(command, 'onset')).toEqual({ x: 10, y: 40, width: 0, height: 3 })
    })

    it('sits at the offset for the other end', () => {
        expect(endOf(command, 'offset')).toEqual({ x: 40, y: 40, width: 0, height: 3 })
    })
})

describe('the id an arrow is drawn under', () => {
    it('is the edit itself where one end moved', () => {
        expect(arrowId(edit({}), 'onset', ['onset'])).toBe('edit-1')
    })

    it('tells the two arrows apart where both ends moved', () => {
        expect(arrowId(edit({}), 'offset', ['onset', 'offset'])).toBe('edit-1-offset')
    })
})

describe('where the mark of an edit\'s belief sits', () => {
    it('is just above the right edge of everything the edit touches', () => {
        const boxes = [
            { x: svg(10), y: svg(40), width: svg(5), height: svg(3) },
            { x: svg(30), y: svg(50), width: svg(10), height: svg(3) }
        ]

        expect(beliefMarkAt(boxes)).toEqual({ x: 40, y: 20 })
    })
})
