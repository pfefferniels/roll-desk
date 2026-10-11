import { describe, expect, it } from 'vitest'
import { assignReference, Edit, Edition, HoleChain, RollCopy, systemOf, Version, welteT100 } from 'linked-rolls'
import { emptyMetadata } from './EditionContext'
import { hole, note } from './editionFixture'
import { derivationEvidenceOf } from './derivationEvidence'

const copy = (id: string, produced: HoleChain[]): RollCopy => ({
    type: 'RollCopy',
    id,
    measurements: {},
    conditions: [],
    modifications: [],
    keeper: { name: 'Test', sameAs: [] },
    production: { produced }
})

const version = (id: string, edits: Edit[], basedOn?: string): Version => ({
    id,
    system: systemOf(welteT100),
    edits,
    motivations: [],
    ...(basedOn ? { basedOn: [assignReference(basedOn)] } : {})
})

/**
 * A, the root, on all three copies; B from A on the first and second;
 * D from B on the second alone, adding two notes as accents and striking
 * one of B's; C from A on the third. Each copy carries the root's note
 * on a hole of its own.
 */
const stemma = (): Edition => ({
    ...structuredClone(emptyMetadata),
    copies: [
        copy('first', [hole('a1', 1000, 1010, 47), hole('b1', 1100, 1110, 49), hole('b1-other', 1300, 1310, 50)]),
        copy('second', [hole('a2', 1000, 1010, 47), hole('b2', 1100, 1110, 49), hole('d1', 1200, 1210, 51), hole('d2', 1400, 1410, 52)]),
        copy('third', [hole('a3', 1000, 1010, 47), hole('c', 1500, 1510, 53)])
    ],
    versions: [
        version('A', [{ type: 'edit', id: 'edit-a', insert: [{ ...note('note-a', 60, 'a1'), carriers: ['a1', 'a2', 'a3'].map(assignReference) }] }]),
        version('B', [{
            type: 'edit',
            id: 'edit-b',
            insert: [{ ...note('note-b', 62, 'b1'), carriers: ['b1', 'b2'].map(assignReference) }, note('note-b-other', 63, 'b1-other')]
        }], 'A'),
        version('D', [
            { type: 'edit', id: 'accent-1', editType: 'additional-accent', insert: [note('note-d1', 64, 'd1')] },
            { type: 'edit', id: 'accent-2', editType: 'additional-accent', insert: [note('note-d2', 65, 'd2')] },
            { type: 'edit', id: 'strike', delete: ['note-b-other'] }
        ], 'B'),
        version('C', [{ type: 'edit', id: 'edit-c', insert: [note('note-c', 66, 'c')] }], 'A')
    ]
})

describe('the evidence for a derivation', () => {
    it('lists the copies of the line first, with what each bears of the version and of its parent', () => {
        const evidence = derivationEvidenceOf(stemma(), 'D')

        expect(evidence).toMatchObject({ inserted: 2, struck: 1, parent: { version: 'B', inserted: 2 } })
        expect(evidence?.rows).toEqual([
            {
                copy: 'second', keeps: 0,
                insertions: { inLine: true, carried: 2, replaced: 0, struck: 0, unaccounted: 0 },
                parent: { inLine: true, carried: 1, replaced: 0, struck: 1, unaccounted: 0 }
            },
            {
                copy: 'first', keeps: 1,
                insertions: { inLine: false, carried: 0, replaced: 0, struck: 0, unaccounted: 0 },
                parent: { inLine: true, carried: 2, replaced: 0, struck: 0, unaccounted: 0 }
            },
            {
                copy: 'third', keeps: 0,
                insertions: { inLine: false, carried: 0, replaced: 0, struck: 0, unaccounted: 0 },
                parent: { inLine: false, carried: 0, replaced: 0, struck: 0, unaccounted: 0 }
            }
        ])
    })

    it('names the versions apart from its line that none of its copies follows', () => {
        expect(derivationEvidenceOf(stemma(), 'D')?.apart).toEqual(['C'])
        expect(derivationEvidenceOf(stemma(), 'C')?.apart).toEqual(['B', 'D'])
    })

    it('counts the edits by type, the most frequent first and those stating none last', () => {
        expect(derivationEvidenceOf(stemma(), 'D')?.editTypes).toEqual([['additional-accent', 2], [undefined, 1]])
    })

    it('leaves out the root as a parent, since every copy shares its text', () => {
        expect(derivationEvidenceOf(stemma(), 'B')?.parent).toBeUndefined()
        expect(derivationEvidenceOf(stemma(), 'B')?.rows.every(row => row.parent === undefined)).toBe(true)
    })

    it('has nothing for the root or a version the edition lacks', () => {
        expect(derivationEvidenceOf(stemma(), 'A')).toBeUndefined()
        expect(derivationEvidenceOf(stemma(), 'missing')).toBeUndefined()
    })
})
