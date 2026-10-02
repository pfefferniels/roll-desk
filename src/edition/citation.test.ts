import { describe, expect, it } from 'vitest'
import { Edition } from 'linked-rolls'
import { Citation, citationIn, partNamed } from './citation'
import { fixtureEdition, ids } from './editionFixture'
import { versionLabel } from './names'
import { Commit } from './publication'

/** The fixture, published as welte225.org publishes WM 225. */
const published = (): Edition => {
    const edition = fixtureEdition()
    edition.base = 'https://welte225.org/'
    edition.title = 'Alfred Grünfeld spielt Robert Schumann, Träumerei'
    edition.version = '1.0'
    edition.roll.catalogueNumber = 'WM 225'
    edition.creation.publisher = { name: 'Niels Pfeffer', sameAs: [] }
    edition.creation.publicationDate = new Date(2026, 9, 2)
    return edition
}

const commit: Commit = {
    sha: 'fc71626d1b2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    date: new Date('2026-09-29T10:00:00Z'),
    repository: 'pfefferniels/welte225.org',
    url: 'https://github.com/pfefferniels/welte225.org/blob/fc71626d1b2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d/edition.jsonld'
}

const ofVersionB = (edition = published()): Citation => ({
    edition,
    part: partNamed(edition, ids.b),
    url: 'https://welte225.org/B',
    commit,
    accessed: new Date(2026, 9, 3)
})

describe('what a citation names', () => {
    it('names a version by its siglum', () => {
        const edition = published()
        const siglum = versionLabel(edition, ids.b)
        expect(citationIn('en', ofVersionB(edition))).toMatch(new RegExp(`^Version ${siglum}, in: `))
        expect(citationIn('de', ofVersionB(edition))).toMatch(new RegExp(`^Version ${siglum}, in: `))
    })

    it('names a copy by its siglum, or else by who holds it', () => {
        const edition = published()
        const ofCopy = { ...ofVersionB(edition), part: partNamed(edition, 'copy') }
        expect(citationIn('en', ofCopy)).toMatch(/^Copy Test, in: /)
        expect(citationIn('de', ofCopy)).toMatch(/^Rollenkopie Test, in: /)
    })

    it('names anything else by its kind and where it stands', () => {
        const edition = published()
        const ofHole = { ...ofVersionB(edition), part: partNamed(edition, 'hole-note') }
        expect(citationIn('en', ofHole)).toMatch(/^Hole chain on copy Test, in: /)
        expect(citationIn('de', ofHole)).toMatch(/^Stanzung auf Rollenkopie Test, in: /)

        const ofNote = { ...ofVersionB(edition), part: partNamed(edition, ids.note) }
        expect(citationIn('en', ofNote)).toMatch(/^Note on version \S+, in: /)
        expect(citationIn('de', ofNote)).toMatch(/^Note in Version \S+, in: /)
    })

    it('names nothing the edition does not hold', () => {
        expect(partNamed(published(), 'nowhere')).toBeUndefined()
    })
})

describe('the suggested citation', () => {
    it('gives the edition, who edited it, its version, the commit and the day it was read', () => {
        expect(citationIn('en', ofVersionB())).toMatch(new RegExp(
            ', in: Alfred Grünfeld spielt Robert Schumann, Träumerei. ' +
            'Roll edition of WM 225, edited by Niels Pfeffer, version 1.0 of 2 October 2026 \\(commit fc71626\\), ' +
            'https://welte225.org/B \\(accessed 3 October 2026\\)\\.$'
        ))
    })

    it('says the same in German', () => {
        expect(citationIn('de', ofVersionB())).toMatch(new RegExp(
            ', in: Alfred Grünfeld spielt Robert Schumann, Träumerei. ' +
            'Rollenedition von WM 225, hrsg. von Niels Pfeffer, Version 1.0 vom 2.10.2026 \\(Commit fc71626\\), ' +
            'https://welte225.org/B \\(zuletzt abgerufen am 3.10.2026\\)\\.$'
        ))
    })

    it('names the editors rather than the publisher where the edition names any', () => {
        const edition = published()
        edition.creation.editors = [
            { name: 'Niels Pfeffer', sameAs: [], role: 'editor' },
            { name: 'Ann Other', sameAs: [], role: 'editor' },
            { name: 'Someone Else', sameAs: [], role: 'proofreading' }
        ]
        edition.creation.publisher = { name: 'A Publisher', sameAs: [] }
        expect(citationIn('en', ofVersionB(edition))).toContain('edited by Niels Pfeffer and Ann Other,')
        expect(citationIn('de', ofVersionB(edition))).toContain('hrsg. von Niels Pfeffer und Ann Other,')
    })

    it('gives the day of publication where the edition states no version', () => {
        const edition = published()
        delete edition.version
        expect(citationIn('en', ofVersionB(edition))).toContain('Niels Pfeffer, published 2 October 2026 (commit fc71626)')
        expect(citationIn('de', ofVersionB(edition))).toContain('Niels Pfeffer, veröffentlicht am 2.10.2026 (Commit fc71626)')
    })

    it('leaves out the commit where it is not known', () => {
        expect(citationIn('en', { ...ofVersionB(), commit: undefined })).toContain('version 1.0 of 2 October 2026, https://')
    })

    it('cites the edition as a whole without a part', () => {
        expect(citationIn('de', { ...ofVersionB(), part: undefined, url: 'https://welte225.org/' }))
            .toMatch(/^Alfred Grünfeld spielt Robert Schumann, Träumerei\. Rollenedition/)
    })
})
