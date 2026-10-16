import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { Edit, Edition, Motivation, musicalChange, technicalChange } from 'linked-rolls'
import { editsAlongRoll, HeldMotivation, inFocusOn, kindOfAll, motivationIdFor, stateKind } from './motivation'
import { fixtureEdition, ids } from './editionFixture'

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

    it('is never the one an import of an older document reads off the shape, nor the editor\'s', () => {
        expect(motivationIdFor('Unchecked', [])).toBe('unchecked-2')
        expect(motivationIdFor('Editor', [])).toBe('editor-2')
    })
})

describe('the motivations in focus on a roll', () => {
    const cleanup: Motivation = { type: 'motivation', id: 'cleanup', note: 'Bereinigung' }
    const accent: Motivation = { type: 'motivation', id: 'accent', note: 'Akzent' }
    const held: HeldMotivation[] = [{ versionId: 'B', motivation: cleanup }]

    it('are those held where nothing is pointed at', () => {
        expect(inFocusOn('B', held)).toEqual([cleanup])
    })

    it('are the one pointed at ahead of those held', () => {
        expect(inFocusOn('B', held, { versionId: 'B', motivation: accent })).toEqual([accent])
    })

    it('leave a motivation of another version pointed at to that version', () => {
        expect(inFocusOn('B', held, { versionId: 'C', motivation: accent })).toEqual([cleanup])
    })

    it('leave out what another version holds', () => {
        expect(inFocusOn('C', held)).toEqual([])
    })
})

describe('the edits a motivation holds along the roll', () => {
    const cleanup: Motivation = { type: 'motivation', id: 'cleanup' }

    /** Version B, deleting what the ids name in this order, each edit under the motivation. */
    const deleting = (...deleted: string[]) => {
        const edition = fixtureEdition()
        const b = edition.versions.find(version => version.id === ids.b)!
        edition.motivations = [cleanup]
        b.edits = deleted.map(id => ({ type: 'edit', id: `delete-${id}`, delete: [id], motivation: cleanup.id }))
        return edition
    }

    const along = (...deleted: string[]) =>
        editsAlongRoll(deleting(...deleted), { versionId: ids.b, motivation: cleanup }).map(edit => edit.id)

    it('come in the order of where they begin rather than in the version\'s', () => {
        expect(along(ids.otherNote, ids.forzandoOn, ids.note)).toEqual(
            [`delete-${ids.forzandoOn}`, `delete-${ids.note}`, `delete-${ids.otherNote}`]
        )
    })

    it('put an edit touching nothing placed last', () => {
        expect(along(ids.label, ids.note)).toEqual([`delete-${ids.note}`, `delete-${ids.label}`])
    })

    it('leave out the edits of other motivations', () => {
        const edition = deleting(ids.note, ids.otherNote)
        edition.versions.find(version => version.id === ids.b)!.edits![1]!.motivation = 'other'
        expect(editsAlongRoll(edition, { versionId: ids.b, motivation: cleanup }).map(edit => edit.id))
            .toEqual([`delete-${ids.note}`])
    })
})

describe('saying what kind of change edits are', () => {
    const reason: Motivation = { type: 'motivation', id: 'accent', note: 'An accent withdrawn.' }
    // Looked up by hand, since a lookup of the library's settles the edition it reads.
    const editOf = (edition: Edition): Edit => edition.versions.find(version => version.id === ids.b)!.edits!.find(edit => edit.id === 'edit-b')!
    const motivated = (motivation: string) => {
        const edition = fixtureEdition()
        edition.motivations = [reason]
        editOf(edition).motivation = motivation
        return edition
    }

    it('makes a musical change technical, the reason it was given going once nothing names it', () => {
        const next = produce(motivated('accent'), stateKind(ids.b, ['edit-b'], 'technical'))
        expect(editOf(next).motivation).toBe(technicalChange)
        expect(next.motivations).toEqual([])
    })

    it('makes a technical change musical, its reason left to be given', () => {
        const next = produce(motivated(technicalChange), stateKind(ids.b, ['edit-b'], 'musical'))
        expect(editOf(next).motivation).toBe(musicalChange)
        expect(next.motivations).toEqual([reason])
    })

    it('keeps the reason of an edit already musical', () => {
        const before = motivated('accent')
        expect(produce(before, stateKind(ids.b, ['edit-b'], 'musical'))).toBe(before)
    })

    it('leaves the text of a version that derives from none as it is', () => {
        const before = fixtureEdition()
        expect(produce(before, stateKind(ids.a, ['edit-a'], 'technical'))).toBe(before)
    })

    it('tells the kind the edits agree on, and none where they do not', () => {
        expect(kindOfAll([{ motivation: technicalChange }, { motivation: technicalChange }])).toBe('technical')
        expect(kindOfAll([{ motivation: musicalChange }, { motivation: 'accent' }])).toBe('musical')
        expect(kindOfAll([{ motivation: musicalChange }, { motivation: technicalChange }])).toBeUndefined()
    })
})
