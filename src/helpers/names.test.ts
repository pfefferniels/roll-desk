import { describe, expect, it } from 'vitest'
import { RollCopy } from 'linked-rolls'
import { copyLabel, nameOf, secondarySourceOf, whichCopy } from './names'
import { fixtureEdition, ids, viewOf } from './editionFixture'

const copy = (): RollCopy => {
    const [first] = fixtureEdition().copies
    if (!first) throw new Error('the fixture has changed')
    return first
}

describe('what a reader calls a copy', () => {
    it('is its siglum where it has one', () => {
        expect(copyLabel({ ...copy(), siglum: 'W1' })).toBe('W1')
        expect(whichCopy({ ...copy(), siglum: 'W1' })).toBe('W1')
    })

    it('is who holds it where it has none', () => {
        expect(copyLabel(copy())).toBe('Test')
        expect(whichCopy(copy())).toBe('held by Test')
    })

    it('says so where nobody is known to hold it', () => {
        const unheld = copy()
        delete unheld.keeper
        expect(copyLabel(unheld)).toBe('unnamed copy')
        expect(whichCopy(unheld)).toBe('held by an unnamed keeper')
    })
})

describe('the name under an id', () => {
    const view = viewOf(fixtureEdition())

    it('is the siglum of a version and the label of a copy', () => {
        expect(nameOf(view, ids.b)).toBe('B')
        expect(nameOf(view, 'copy')).toBe('Test')
    })

    it('is none for anything else, and for an id the edition lacks', () => {
        expect(nameOf(view, ids.note)).toBeUndefined()
        expect(nameOf(view, 'missing')).toBeUndefined()
    })
})

describe('the kind of secondary source a copy is known from', () => {
    it('is named where somebody else had read the roll already', () => {
        expect(secondarySourceOf({ ...copy(), readFrom: { kind: 'recording' } })).toBe('Audio recording')
        expect(secondarySourceOf({ ...copy(), readFrom: { kind: 'emulation' } })).toBe('MIDI emulation')
    })

    it('is none for a copy whose features were measured, or that states no source', () => {
        expect(secondarySourceOf({ ...copy(), readFrom: { kind: 'scan' } })).toBeUndefined()
        const unstated = copy()
        delete unstated.readFrom
        expect(secondarySourceOf(unstated)).toBeUndefined()
    })
})
