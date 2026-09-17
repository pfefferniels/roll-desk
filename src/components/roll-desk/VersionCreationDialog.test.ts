import { describe, expect, it } from 'vitest'
import { Concept, procedures } from 'linked-rolls'
import { keyOf, procedureIn, proceduresOffered } from './VersionCreationDialog'

const declared = procedures[0]!
const unknown: Concept = { id: 'https://example.org/procedure/invented', name: 'invented', sameAs: [] }
const nameless: Concept = { name: 'Umstanzung für ein anderes Wiedergabesystem', sameAs: [] }

describe('the procedures the dialog offers', () => {
    it('offers the ones the vocabulary declares', () => {
        expect(proceduresOffered(undefined)).toEqual(procedures)
        expect(proceduresOffered(declared)).toEqual(procedures)
    })

    it('offers a stored procedure the vocabulary does not know', () => {
        expect(proceduresOffered(unknown)).toContain(unknown)
        expect(proceduresOffered(nameless)).toContain(nameless)
    })
})

describe('the procedure a saved dialog states', () => {
    it('keeps a declared one', () => {
        expect(procedureIn(proceduresOffered(declared), keyOf(declared))).toEqual(declared)
    })

    it('keeps one the vocabulary does not know rather than dropping it', () => {
        expect(procedureIn(proceduresOffered(unknown), keyOf(unknown))).toEqual(unknown)
        expect(procedureIn(proceduresOffered(nameless), keyOf(nameless))).toEqual(nameless)
    })

    it('states none where the field stands on nothing', () => {
        expect(procedureIn(proceduresOffered(declared), '')).toBeUndefined()
    })
})
