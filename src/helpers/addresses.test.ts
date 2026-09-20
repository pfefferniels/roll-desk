import { describe, expect, it } from 'vitest'
import { Assumption, Edition, Motivation, Note } from 'linked-rolls'
import { deskPath, entityOfPath, idOfMark, linkTarget, referenceOf } from './addresses'
import { fixtureEdition, ids, viewOf } from './editionFixture'
import { HeldMotivation } from './motivation'

const note = (id: string, pitch: number): Note => ({ type: 'note', id, pitch, carriers: [] })

const assumed = (id: string): Assumption['@annotation'] => ({
    id,
    belief: { type: 'belief', id: `${id}-belief`, certainty: 'likely', reasons: [] }
})

/** The fixture with a motivation behind the edit of version B, and a belief about that edit. */
const motivatedEdition = () => {
    const edition = fixtureEdition()
    const version = edition.versions[1]
    const edit = version?.edits?.[0]
    if (!version || !edit) throw new Error('the fixture has changed')

    const motivation: Motivation = { type: 'motivation', id: 'chord-shading' }
    version.motivations = [motivation]
    edit.motivation = motivation.id
    edit['@annotation'] = assumed('why-b')

    return edition
}

/** Version A writing the same motivation id, as a collation writes `unchecked` on every version it makes. */
const alsoInA = (edition: Edition) => {
    const version = edition.versions[0]
    if (!version) throw new Error('the fixture has changed')
    version.motivations = [{ type: 'motivation', id: 'chord-shading' }]
    return edition
}

/** B's motivation, as the desk holds it: the motivation and the version it belongs to. */
const motivationOfB = (edition: Edition): HeldMotivation => {
    const motivation = edition.versions[1]?.motivations[0]
    if (!motivation) throw new Error('the fixture has changed')
    return { versionId: ids.b, motivation }
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
    const view = () => viewOf(fixtureEdition())

    it('is the one entity selected', () => {
        expect(deskPath(view(), { versionId: 'A', selection: [note('note-1', 60)] })).toBe('/note-1')
    })

    it('falls back to the version where several things are selected', () => {
        const selection = [note('note-1', 60), note('note-2', 62)]

        expect(deskPath(view(), { versionId: 'A', selection })).toBe('/A')
    })

    it('names a copy by its id, as every other entity is named', () => {
        expect(deskPath(view(), { copyId: 'c-1', selection: [] })).toBe('/c-1')
    })

    it('is none where the desk has nothing open, so that no address is written over', () => {
        expect(deskPath(view(), { selection: [] })).toBeUndefined()
    })

    it('names a motivation by its id, no other version writing that id', () => {
        const edition = motivatedEdition()

        expect(deskPath(viewOf(edition), { versionId: ids.b, selection: [motivationOfB(edition)] }))
            .toBe('/chord-shading')
    })

    it('falls back to the version where another version writes the same motivation id', () => {
        const edition = alsoInA(motivatedEdition())

        expect(deskPath(viewOf(edition), { versionId: ids.b, selection: [motivationOfB(edition)] }))
            .toBe(`/${ids.b}`)
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

    /** The id the target marks, as the desk spotlights it. */
    const marked = (target: ReturnType<typeof linkTarget>) =>
        target && 'mark' in target && target.mark && idOfMark(target.mark)

    it('is the version a symbol was inserted in, and the symbol', () => {
        const target = linkTarget(viewOf(fixtureEdition()), ids.note)

        expect(target).toMatchObject({ on: 'version', versionId: ids.a })
        expect(marked(target)).toBe(ids.note)
    })

    it('is the copy a feature lies on, and the feature', () => {
        const target = linkTarget(viewOf(fixtureEdition()), 'hole-note')

        expect(target).toMatchObject({ on: 'copy', copyId: 'copy' })
        expect(marked(target)).toBe('hole-note')
    })

    it('is the version an edit belongs to, and the edit', () => {
        const target = linkTarget(viewOf(fixtureEdition()), 'edit-b')

        expect(target).toMatchObject({ on: 'version', versionId: ids.b })
        expect(marked(target)).toBe('edit-b')
    })

    it('is the version a motivation belongs to, and the motivation as that version holds it', () => {
        const target = linkTarget(viewOf(motivatedEdition()), 'chord-shading')

        expect(target).toMatchObject({
            on: 'version',
            versionId: ids.b,
            mark: { versionId: ids.b, motivation: { id: 'chord-shading' } }
        })
    })

    it('marks what a belief is held about, the belief being nothing the desk draws', () => {
        const target = linkTarget(viewOf(motivatedEdition()), 'why-b-belief')

        expect(target).toMatchObject({ on: 'version', versionId: ids.b })
        expect(marked(target)).toBe('edit-b')
    })

    it('is the edition itself for what lies on no version and no copy', () => {
        const edition = fixtureEdition()
        edition.roll.recordingEvent.date['@annotation'] = assumed('when-recorded')

        expect(linkTarget(viewOf(edition), 'when-recorded')).toEqual({ on: 'edition' })
    })
})
