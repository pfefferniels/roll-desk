import { describe, expect, it } from 'vitest'
import { asJsonLd, validate } from 'linked-rolls'
import { Reading, checkedDocument, importedEdition, readDocument, refusalToOpen } from './importEdition'
import { fixtureEdition } from './editionFixture'

const current = () => asJsonLd(fixtureEdition())

const refusalIn = <T>(reading: Reading<T>): string | undefined =>
    'refusal' in reading ? reading.refusal : undefined

/** The document as the 0.1 format wrote it: the keeper a string, the version typed by its typology. */
const inOldFormat = () => {
    const document = current()
    document.copies = document.copies.map(({ keeper, ...copy }: { keeper: { name: string } }) => ({ ...copy, location: keeper.name }))
    document.versions = document.versions.map(({ versionType, ...version }: { versionType: string }) => ({ ...version, '@type': versionType }))
    return document
}

describe('checking a document before importing it', () => {
    it('finds nothing wrong with a document in the current format', () => {
        expect(checkedDocument(current()).errors).toEqual([])
    })

    it('finds nothing wrong with a document in an older format', () => {
        expect(validate(inOldFormat())).toBe(false)
        expect(checkedDocument(inOldFormat()).errors).toEqual([])
    })

    it('hands on the document the import would read', () => {
        expect(checkedDocument(inOldFormat()).document).toEqual(checkedDocument(current()).document)
    })

    it('reports what the schema turns down, and keeps the document to proceed with', () => {
        const broken = { ...current(), versions: 'none' }

        expect(checkedDocument(broken).errors.length).toBeGreaterThan(0)
        expect(checkedDocument(broken).document).toMatchObject({ versions: 'none' })
    })

    it('turns down what is no document at all without trying to migrate it', () => {
        expect(checkedDocument(null).errors.length).toBeGreaterThan(0)
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
    it('hands on the checked document the text states', () => {
        expect(refusalIn(readDocument(JSON.stringify(current())))).toBeUndefined()
    })

    it('says that a file holds no JSON', () => {
        expect(refusalIn(readDocument('<!doctype html>'))).toMatch(/JSON/)
    })

    it('says that the migration could not follow the document', () => {
        const depth = 50000
        const nestedDeeperThanTheMigrationRecurses = '{"copies":'.repeat(depth) + '[]' + '}'.repeat(depth)

        expect(refusalIn(readDocument(nestedDeeperThanTheMigrationRecurses))).toMatch(/current format/)
    })
})

describe('importing a document', () => {
    it('reads an edition from a document the schema accepts', () => {
        expect(refusalIn(importedEdition(checkedDocument(current()).document))).toBeUndefined()
    })

    it('says that the document states no edition, as proceeding past the schema may find', () => {
        expect(refusalIn(importedEdition({ ...current(), copies: 3 }))).toMatch(/edition/)
    })
})
