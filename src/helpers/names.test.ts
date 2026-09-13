import { describe, expect, it } from 'vitest'
import { RollCopy } from 'linked-rolls'
import { copyLabel, nameOf, whichCopy } from './names'
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
