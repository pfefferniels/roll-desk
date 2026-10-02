import { describe, expect, it } from 'vitest'
import type { AnySymbol, Edition, Version } from 'linked-rolls'
import { compassOf } from './compass'

const note = (pitch: number) => ({ type: 'note', id: `n${pitch}`, pitch }) as AnySymbol
const expression = { type: 'expression', id: 'e', expressionType: 'MezzoforteOn', scope: 'bass' } as AnySymbol

const versionInserting = (...insert: AnySymbol[]) =>
    ({ id: 'v', edits: [{ id: 'edit', insert }] }) as unknown as Version

const editionOf = (...versions: Version[]) => ({ versions }) as Pick<Edition, 'versions'>

describe('the compass of an edition', () => {
    it('reaches from the lowest note inserted to the highest', () => {
        expect(compassOf(editionOf(versionInserting(note(60), note(31), note(88)))))
            .toEqual({ lowest: 31, highest: 88 })
    })

    it('takes in every version, not only one of them', () => {
        expect(compassOf(editionOf(versionInserting(note(60)), versionInserting(note(40), note(96)))))
            .toEqual({ lowest: 40, highest: 96 })
    })

    it('leaves the expression out of it', () => {
        expect(compassOf(editionOf(versionInserting(note(50), expression))))
            .toEqual({ lowest: 50, highest: 50 })
    })

    it('is nothing where no version plays a note', () => {
        expect(compassOf(editionOf())).toBeUndefined()
        expect(compassOf(editionOf(versionInserting(expression)))).toBeUndefined()
    })
})
