import { describe, expect, it } from 'vitest'
import { asJsonLd, validate } from 'linked-rolls'
import { Reading, checkedDocument, importedEdition, readDocument, refusalToOpen } from './importEdition'
import { fixtureEdition } from './editionFixture'

/** The stored document has no type of its own, so the test shapes what it edits. */
type Document = {
    copies: { keeper: { name: string } }[]
    versions: { versionType: string }[]
}

const current = () => asJsonLd(fixtureEdition()) as Document

const refusalIn = <T>(reading: Reading<T>): string | undefined =>
    'refusal' in reading ? reading.refusal : undefined

/** The document as the 0.1 format wrote it: the keeper a string, the version typed by its typology. */
const inOldFormat = () => {
    const document = current()
    return {
        ...document,
        copies: document.copies.map(({ keeper, ...copy }) => ({ ...copy, location: keeper.name })),
        versions: document.versions.map(({ versionType, ...version }) => ({ ...version, '@type': versionType }))
    }
}

describe('checking a document before importing it', () => {
    it('finds nothing wrong with a document in the current format', async () => {
        expect((await checkedDocument(current())).errors).toEqual([])
    })

    it('finds nothing wrong with a document in an older format', async () => {
        expect(validate(inOldFormat())).toBe(false)
        expect((await checkedDocument(inOldFormat())).errors).toEqual([])
    })

    it('hands on the document the import would read', async () => {
        expect((await checkedDocument(inOldFormat())).document)
            .toEqual((await checkedDocument(current())).document)
    })

    it('reports what the schema turns down, and keeps the document to proceed with', async () => {
        const broken = { ...current(), versions: 'none' }

        expect((await checkedDocument(broken)).errors.length).toBeGreaterThan(0)
        expect((await checkedDocument(broken)).document).toMatchObject({ versions: 'none' })
    })

    it('turns down what is no document at all without trying to migrate it', async () => {
        expect((await checkedDocument(null)).errors.length).toBeGreaterThan(0)
    })
})

describe('choosing a file to open', () => {
    it('opens .json and .jsonld files, whatever case the name is written in', () => {
        expect(refusalToOpen('edition.json')).toBeUndefined()
        expect(refusalToOpen('edition.JSONLD')).toBeUndefined()
    })

    it('names the file it turns down and what it reads instead', () => {
        expect(refusalToOpen('scan.tiff')).toContain('scan.tiff')
        expect(refusalToOpen('scan.tiff')).toContain('.jsonld')
    })
})

describe('reading a file', () => {
    it('hands on the checked document the text states', async () => {
        expect(refusalIn(await readDocument(JSON.stringify(current())))).toBeUndefined()
    })

    it('says that a file holds no JSON', async () => {
        expect(refusalIn(await readDocument('<!doctype html>'))).toMatch(/JSON/)
    })

    it('says that the migration could not follow the document', async () => {
        const depth = 50000
        const nestedDeeperThanTheMigrationRecurses = '{"copies":'.repeat(depth) + '[]' + '}'.repeat(depth)

        expect(refusalIn(await readDocument(nestedDeeperThanTheMigrationRecurses))).toMatch(/current format/)
    })
})

describe('importing a document', () => {
    it('reads an edition from a document the schema accepts', async () => {
        expect(refusalIn(importedEdition((await checkedDocument(current())).document))).toBeUndefined()
    })

    it('says that the document states no edition, as proceeding past the schema may find', () => {
        expect(refusalIn(importedEdition({ ...current(), copies: 3 }))).toMatch(/edition/)
    })
})
