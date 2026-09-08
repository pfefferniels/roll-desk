import { describe, expect, it } from 'vitest'
import { Edit, editTypes, Note } from 'linked-rolls'
import { editTypeLabel, hullId } from './EditView'

const note = (id: string): Note => ({ type: 'note', id, pitch: 60, carriers: [] })

const edit = (parts: Partial<Edit>): Edit => ({ type: 'edit', id: 'edit-1', ...parts })

describe('the word written under an edit', () => {
    it('is left out where there is no type to write', () => {
        expect(editTypeLabel(undefined)).toBeUndefined()
    })

    it('is a sign of its own for an accent and a correction', () => {
        expect(editTypeLabel('additional-accent')).toBe('>')
        expect(editTypeLabel('correct-error')).toBe('fix')
    })

    it('is left out for a shift, which the arrow already tells', () => {
        expect(editTypeLabel('shift')).toBeUndefined()
    })

    it('is otherwise the name of the type, read as words', () => {
        expect(editTypeLabel('add-redundancy')).toBe('add redundancy')
    })

    it('is given for every type the library knows, the shift apart', () => {
        const unlabelled = editTypes.filter(editType => !editTypeLabel(editType))

        expect(unlabelled).toEqual(['shift'])
    })
})

describe('the id a hull is drawn under', () => {
    it('is the edit itself where the edit only inserts', () => {
        expect(hullId(edit({ insert: [note('a')] }), 'insert')).toBe('edit-1')
    })

    it('is the edit itself where the edit only deletes', () => {
        expect(hullId(edit({ delete: ['a'] }), 'delete')).toBe('edit-1')
    })

    it('tells the two hulls apart where the edit does both', () => {
        const replacement = edit({ insert: [note('a')], delete: ['b'] })

        expect(hullId(replacement, 'insert')).toBe('edit-1-insert')
        expect(hullId(replacement, 'delete')).toBe('edit-1-delete')
    })
})
