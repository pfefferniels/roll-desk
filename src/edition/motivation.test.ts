import { describe, expect, it } from 'vitest'
import { unchecked } from 'linked-rolls'
import { motivationIdFor } from './motivation'

describe('the id made for a new motivation', () => {
    it('is its note in lowercase words joined by hyphens', () => {
        expect(motivationIdFor('Bereinigung des Basses', [])).toBe('bereinigung-des-basses')
    })

    it('spells umlauts out and drops other accents', () => {
        expect(motivationIdFor('Ausgedünntes Crescendo, größer', [])).toBe('ausgeduenntes-crescendo-groesser')
        expect(motivationIdFor('Crescendo à la française', [])).toBe('crescendo-a-la-francaise')
    })

    it('leaves out what is neither letter nor digit', () => {
        expect(motivationIdFor('Weniger Akzent auf f′', [])).toBe('weniger-akzent-auf-f')
    })

    it('cuts a long note after the last whole word that fits', () => {
        expect(motivationIdFor(
            'Eine Stanzung der Mutterrolle, die eine spätere Revision verlegt oder getilgt hat', []
        )).toBe('eine-stanzung-der-mutterrolle-die-eine')
    })

    it('cuts a single word that does not fit', () => {
        expect(motivationIdFor('Ausdruck'.repeat(6), [])).toHaveLength(40)
    })

    it('falls back on a word of its own where the note has none', () => {
        expect(motivationIdFor('…', [])).toBe('motivation')
    })

    it('is numbered where the edition already holds the id', () => {
        expect(motivationIdFor('Bereinigung', ['bereinigung'])).toBe('bereinigung-2')
        expect(motivationIdFor('Bereinigung', ['bereinigung', 'bereinigung-2'])).toBe('bereinigung-3')
    })

    it('is never the collation\'s own nor the editor\'s', () => {
        expect(motivationIdFor('Unchecked', [])).toBe(`${unchecked}-2`)
        expect(motivationIdFor('Editor', [])).toBe('editor-2')
    })
})
