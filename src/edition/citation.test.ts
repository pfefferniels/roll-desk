import { describe, expect, it } from 'vitest'
import { Edition } from 'linked-rolls'
import { asBibLaTeX, asRis, asText, Citation, partNamed } from './citation'
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
    iri: 'https://welte225.org/B',
    commit,
    accessed: new Date(2026, 9, 3)
})

describe('what a citation names', () => {
    it('names a version by its siglum', () => {
        const edition = published()
        expect(partNamed(edition, ids.b)).toBe(`Version ${versionLabel(edition, ids.b)}`)
    })

    it('names a copy by its siglum, or else by who holds it', () => {
        expect(partNamed(published(), 'copy')).toBe('Copy Test')
    })

    it('names anything else by its kind and the version it stands on', () => {
        const edition = published()
        expect(partNamed(edition, ids.note)).toMatch(/^Note on version /)
    })

    it('names a hole chain as two words', () => {
        expect(partNamed(published(), 'hole-note')).toBe('Hole chain on copy Test')
    })

    it('names nothing the edition does not hold', () => {
        expect(partNamed(published(), 'nowhere')).toBeUndefined()
    })
})

describe('a citation as text', () => {
    it('gives the part, the edition, its version, the commit and the day it was read', () => {
        const citation = ofVersionB()
        expect(asText(citation)).toBe(
            `${citation.part}, in: Niels Pfeffer: Alfred Grünfeld spielt Robert Schumann, Träumerei. ` +
            'Roll edition of WM 225, version 1.0 of 2 October 2026 (commit fc71626), ' +
            'https://welte225.org/B, accessed 3 October 2026.'
        )
    })

    it('names the editors as editors, and the publisher only where there are none', () => {
        const edition = published()
        edition.creation.editors = [
            { name: 'Niels Pfeffer', sameAs: [], role: 'editor' },
            { name: 'Someone Else', sameAs: [], role: 'proofreading' }
        ]
        expect(asText(ofVersionB(edition))).toContain('in: Niels Pfeffer (ed.): Alfred')
    })

    it('gives the day of publication where the edition states no version', () => {
        const edition = published()
        delete edition.version
        expect(asText(ofVersionB(edition))).toContain('Roll edition of WM 225, published 2 October 2026 (commit fc71626)')
    })

    it('leaves out the commit where it is not known', () => {
        expect(asText({ ...ofVersionB(), commit: undefined })).not.toContain('commit')
    })

    it('cites the edition as a whole without a part', () => {
        expect(asText({ ...ofVersionB(), part: undefined, iri: 'https://welte225.org/' }))
            .toMatch(/^Niels Pfeffer: Alfred Grünfeld/)
    })
})

describe('a citation as BibLaTeX', () => {
    it('is a dataset with the version, the dates and the commit', () => {
        const bib = asBibLaTeX(ofVersionB())
        expect(bib).toMatch(/^@dataset\{WM225-B,\n/)
        expect(bib).toContain('  author = {Niels Pfeffer},\n')
        expect(bib).toContain('  version = {1.0},\n')
        expect(bib).toContain('  date = {2026-10-02},\n')
        expect(bib).toContain('  url = {https://welte225.org/B},\n')
        expect(bib).toContain('  urldate = {2026-10-03},\n')
        expect(bib).toContain('  note = {Commit fc71626 of github.com/pfefferniels/welte225.org},\n')
        expect(bib.endsWith('\n}')).toBe(true)
    })

    it('escapes what TeX would read as markup', () => {
        const edition = published()
        edition.title = 'Rolls & Holes: 100% #1_a'
        expect(asBibLaTeX(ofVersionB(edition))).toContain('title = {Rolls \\& Holes: 100\\% \\#1\\_a}')
    })
})

describe('a citation as RIS', () => {
    it('is a dataset record standing in the edition', () => {
        const citation = ofVersionB()
        const ris = asRis(citation).split('\n')
        expect(ris[0]).toBe('TY  - DATA')
        expect(ris).toContain('AU  - Niels Pfeffer')
        expect(ris).toContain(`TI  - ${citation.part}`)
        expect(ris).toContain('T2  - Alfred Grünfeld spielt Robert Schumann, Träumerei: Roll edition of WM 225')
        expect(ris).toContain('ET  - 1.0')
        expect(ris).toContain('DA  - 2026/10/02')
        expect(ris).toContain('Y2  - 2026/10/03')
        expect(ris).toContain('N1  - Commit fc71626 of github.com/pfefferniels/welte225.org')
        expect(ris.at(-2)).toBe('ER  - ')
    })
})
