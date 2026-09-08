import { describe, expect, it } from 'vitest'
import { emptyEdition } from './EditionContext'

describe('the edition the create flow starts from', () => {
    it('carries no versions and no copies', () => {
        const edition = emptyEdition()
        expect(edition.versions).toEqual([])
        expect(edition.copies).toEqual([])
    })

    it('is unnamed, leaving the dialog asking for a name empty', () => {
        expect(emptyEdition().title).toBe('')
    })

    it('is made anew each time, so that a second edition takes nothing from the first', () => {
        expect(emptyEdition().versions).not.toBe(emptyEdition().versions)
        expect(emptyEdition().copies).not.toBe(emptyEdition().copies)
    })
})
