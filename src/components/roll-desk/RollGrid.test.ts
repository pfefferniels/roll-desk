import { describe, expect, it } from 'vitest'
import { mm, track } from 'linked-rolls'
import { selectionOf } from './RollGrid'

const corner = (x: number, position: number) => ({ x: mm(x), track: track(position) })

describe('what a rubber band encloses', () => {
    it('selects nothing while it still sits on its corner', () => {
        expect(selectionOf({ from: corner(10, 5), to: corner(10, 5) })).toBeUndefined()
    })

    it('reads the same whichever way round it was drawn', () => {
        const forwards = selectionOf({ from: corner(10, 5), to: corner(40, 12) })

        expect(forwards).toEqual(selectionOf({ from: corner(40, 12), to: corner(10, 5) }))
        expect(forwards).toEqual({
            horizontal: { from: mm(10), to: mm(40), unit: 'mm' },
            vertical: { from: track(5), to: track(12), unit: 'track' }
        })
    })

    it('keeps a band that only moved across the roll', () => {
        expect(selectionOf({ from: corner(10, 5), to: corner(10, 8) })).toMatchObject({
            horizontal: { from: mm(10), to: mm(10) },
            vertical: { from: track(5), to: track(8) }
        })
    })
})
