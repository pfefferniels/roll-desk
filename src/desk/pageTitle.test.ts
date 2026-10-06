import { describe, expect, it } from 'vitest'
import { headingOf, pageTitleOf } from './pageTitle'
import { fixtureEdition, ids } from '../edition/editionFixture'
import { versionLabel } from '../edition/names'

describe('what the heading names', () => {
    it('is the version on the desk, by the siglum the stemma gives it', () => {
        const edition = fixtureEdition()

        expect(headingOf(edition, { versionId: ids.b })).toBe(`Version ${versionLabel(edition, ids.b)}`)
    })

    it('is the copy on the desk, by what a reader calls it', () => {
        expect(headingOf(fixtureEdition(), { copyId: 'copy' })).toBe('Copy Test')
    })

    it('is nothing on the title page, or where the edition no longer holds what was open', () => {
        expect(headingOf(fixtureEdition(), {})).toBeUndefined()
        expect(headingOf(fixtureEdition(), { versionId: 'gone' })).toBeUndefined()
        expect(headingOf(fixtureEdition(), { copyId: 'gone' })).toBeUndefined()
    })
})

describe('the title of the page', () => {
    it('names what lies on the desk first, then the edition, then the desk', () => {
        const edition = { ...fixtureEdition(), title: 'Träumerei' }

        expect(pageTitleOf(edition, 'Version R4')).toBe('Version R4 · Träumerei · Roll Desk')
    })

    it('is the edition and the desk on the title page', () => {
        expect(pageTitleOf({ ...fixtureEdition(), title: 'Träumerei' })).toBe('Träumerei · Roll Desk')
    })

    it('leaves out a title the edition does not have yet', () => {
        expect(pageTitleOf({ ...fixtureEdition(), title: '  ' }, 'Copy Test')).toBe('Copy Test · Roll Desk')
        expect(pageTitleOf(undefined)).toBe('Roll Desk')
    })
})
