import { describe, expect, it } from 'vitest'
import { Assumption, Motivation, Note } from 'linked-rolls'
import { deskPath, entityOfPath, linkTarget, referenceOf } from './addresses'
import { fixtureEdition, ids, viewOf } from './editionFixture'

const note = (id: string, pitch: number): Note => ({ type: 'note', id, pitch, carriers: [] })

const held = (id: string): Assumption['@annotation'] => ({
    id,
    belief: { type: 'belief', id: `${id}-belief`, certainty: 'likely', reasons: [] }
})

/** The fixture with a motivation behind the edit of version B, and a belief about that edit. */
const motivatedEdition = () => {
    const edition = fixtureEdition()
    const version = edition.versions[1]
    const edit = version?.edits[0]
    if (!version || !edit) throw new Error('the fixture has changed')

    const motivation: Motivation = { type: 'motivation', id: 'chord-shading' }
    version.motivations = [motivation]
    edit.motivation = motivation.id
    edit['@annotation'] = held('why-b')

    return edition
}

describe('the entity an address names', () => {
    it('is the single segment of the path', () => {
        expect(entityOfPath('/symbol_1')).toBe('symbol_1')
    })

    it('is the second segment of a link given out when a copy was named `copy/<id>`', () => {
        expect(entityOfPath('/copy/c-1')).toBe('c-1')
    })

    it('is none for the roll itself', () => {
        expect(entityOfPath('/')).toBeUndefined()
    })

    it('is none for a path of some other shape', () => {
        expect(entityOfPath('/mpm/segment/3')).toBeUndefined()
        expect(entityOfPath('/versions/0')).toBeUndefined()
    })
})

describe('the address of what the desk shows', () => {
    it('is the one entity selected', () => {
        expect(deskPath({ versionId: 'A', selection: [note('note-1', 60)] })).toBe('/note-1')
    })

    it('falls back to the version where several things are selected', () => {
        const selection = [note('note-1', 60), note('note-2', 62)]

        expect(deskPath({ versionId: 'A', selection })).toBe('/A')
    })

    it('names a copy by its id, as every other entity is named', () => {
        expect(deskPath({ copyId: 'c-1', selection: [] })).toBe('/c-1')
    })

    it('is none where the desk has nothing open, so that no address is written over', () => {
        expect(deskPath({ selection: [] })).toBeUndefined()
    })

    it('is the entity IRI under the base of the edition', () => {
        expect(referenceOf('/symbol_1', 'https://welte225.org/'))
            .toBe('https://welte225.org/symbol_1')
    })
})

describe('what a link to an entity opens', () => {
    it('is nothing where the edition holds no such entity', () => {
        expect(linkTarget(viewOf(fixtureEdition()), 'not-in-here')).toBeUndefined()
    })

    it('is the version itself, with nothing to mark', () => {
        expect(linkTarget(viewOf(fixtureEdition()), ids.a))
            .toEqual({ on: 'version', versionId: ids.a, mark: undefined })
    })

    it('is the version a symbol was inserted in, and the symbol', () => {
        const target = linkTarget(viewOf(fixtureEdition()), ids.note)

        expect(target).toMatchObject({ on: 'version', versionId: ids.a })
        expect(target && 'mark' in target && target.mark?.id).toBe(ids.note)
    })

    it('is the copy a feature lies on, and the feature', () => {
        const target = linkTarget(viewOf(fixtureEdition()), 'hole-note')

        expect(target).toMatchObject({ on: 'copy', copyId: 'copy' })
        expect(target && 'mark' in target && target.mark?.id).toBe('hole-note')
    })

    it('is the version an edit belongs to, and the edit', () => {
        const target = linkTarget(viewOf(fixtureEdition()), 'edit-b')

        expect(target).toMatchObject({ on: 'version', versionId: ids.b })
        expect(target && 'mark' in target && target.mark?.id).toBe('edit-b')
    })

    it('is the version a motivation belongs to, and the motivation', () => {
        const target = linkTarget(viewOf(motivatedEdition()), 'chord-shading')

        expect(target).toMatchObject({ on: 'version', versionId: ids.b })
        expect(target && 'mark' in target && target.mark?.id).toBe('chord-shading')
    })

    it('marks what a belief is held about, the belief being nothing the desk draws', () => {
        const target = linkTarget(viewOf(motivatedEdition()), 'why-b-belief')

        expect(target).toMatchObject({ on: 'version', versionId: ids.b })
        expect(target && 'mark' in target && target.mark?.id).toBe('edit-b')
    })

    it('is the edition itself for what lies on no version and no copy', () => {
        const edition = fixtureEdition()
        edition.roll.recordingEvent.date['@annotation'] = held('when-recorded')

        expect(linkTarget(viewOf(edition), 'when-recorded')).toEqual({ on: 'edition' })
    })
})
