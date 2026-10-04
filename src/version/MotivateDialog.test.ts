import { describe, expect, it } from 'vitest'
import { Edit, Motivation, Version } from 'linked-rolls'
import { reasonFor, sharedMotivation, usesOf } from './MotivateDialog'

const motivation = (id: string, note: string): Motivation => ({ type: 'motivation', id, note })
const edit = (id: string, motivation?: string) => ({ type: 'edit', id, motivation }) as Edit

const cleanup = motivation('cleanup', 'Bereinigung')
const restruck = motivation('restruck', 'Der Ton wird abgesetzt und neu angeschlagen')

const version = {
    id: 'v',
    motivations: [cleanup, restruck],
    edits: [edit('a', 'cleanup'), edit('b', 'cleanup'), edit('c', 'restruck'), edit('d')]
} as unknown as Version

describe('the motivation the selected edits share', () => {
    it('is the one they all reference', () => {
        expect(sharedMotivation(version, ['a', 'b'])).toBe(cleanup)
    })

    it('is none where they reference different ones', () => {
        expect(sharedMotivation(version, ['a', 'c'])).toBeUndefined()
    })

    it('is none where one of them references none', () => {
        expect(sharedMotivation(version, ['a', 'd'])).toBeUndefined()
    })
})

describe('how many edits give each motivation', () => {
    it('counts the edits referencing it', () => {
        const uses = usesOf(version)
        expect(uses.get('cleanup')).toBe(2)
        expect(uses.get('restruck')).toBe(1)
    })

    it('counts nothing for edits without one', () => {
        expect([...usesOf(version).keys()]).toEqual(['cleanup', 'restruck'])
    })
})

describe('what a new reason amounts to', () => {
    it('is the motivation the version already gives in these words', () => {
        expect(reasonFor(version.motivations, '  Bereinigung ')).toBe(cleanup)
    })

    it('is the words of a new one otherwise', () => {
        expect(reasonFor(version.motivations, ' Bereinigung des Basses ')).toBe('Bereinigung des Basses')
    })

    it('is nothing where no words are given', () => {
        expect(reasonFor(version.motivations, '   ')).toBeUndefined()
    })
})
