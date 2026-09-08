import { describe, expect, it } from 'vitest'
import { asJsonLd, validate } from 'linked-rolls'
import { checkedDocument } from './importEdition'
import { fixtureEdition } from './editionFixture'

const current = () => asJsonLd(fixtureEdition())

/** The document as the 0.1 format wrote it: the keeper a string, the version typed by its typology. */
const inOldFormat = () => {
    const document = current()
    document.copies = document.copies.map(({ keeper, ...copy }: any) => ({ ...copy, location: keeper.name }))
    document.versions = document.versions.map(({ versionType, ...version }: any) => ({ ...version, '@type': versionType }))
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
