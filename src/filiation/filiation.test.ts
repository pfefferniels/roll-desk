import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { adoptStemma, assignReference, defaultCosts, Edition, proposeStemma, RollCopy, siglaOf, systemOf, TrackMeaning, Version, welteT100 } from 'linked-rolls'
import { emptyMetadata } from '../edition/EditionContext'
import { fixtureEdition, hole, ids } from '../edition/editionFixture'
import {
    amount, asSentence, changeRows, conflictRows, copyNames, defaultTyping, listed, marginLabel, meaningLabel,
    deviationRows, optionsOf, parseAmount, proposedNames, readingRow, readingsApart, supportLabel, textRows, unpinnedRows
} from './filiation'

/** A reading of a text: what it says and where it begins. */
type Item = { meaning: TrackMeaning, at: number, length: number }

const noteAt = (pitch: number, at: number): Item => ({ meaning: { type: 'note', pitch }, at, length: 12 })
const commandAt = (expressionType: string, at: number): Item =>
    ({ meaning: { type: 'expression', expressionType, scope: 'treble' }, at, length: 2 })

/** An accent: the crescendo turned on just before a note and off just after it. */
const accentAt = (at: number): Item[] => [commandAt('SlowCrescendoOn', at - 6), commandAt('SlowCrescendoOff', at + 3)]

const accents = (from: number, count: number): Item[] =>
    Array.from({ length: count }, (_, i) => accentAt(from + i * 160 + 20)).flat()

const punched = (siglum: string, items: readonly Item[]): RollCopy => ({
    type: 'RollCopy',
    id: siglum.toLowerCase(),
    siglum,
    measurements: {},
    conditions: [],
    modifications: [],
    keeper: { name: siglum, sameAs: [] },
    production: {
        system: systemOf(welteT100),
        produced: items.map((item, index) =>
            hole(`${siglum}-${index}`, item.at, item.at + item.length, welteT100.positionOf(item.meaning)!))
    }
})

/**
 * A tradition of known descent, with no stemma stated yet. The mother
 * text is lost; F derives from it, and so does B, from which a lost text
 * derives, and from that both D and E. Each adds accents of its own.
 */
const tradition = (): Edition => {
    const base = Array.from({ length: 145 }, (_, i) => noteAt(48 + (i * 7) % 30, 200 + i * 40))
    const b = [...base, ...accents(200, 10)]
    const c = [...b, ...accents(1820, 8)]
    return {
        ...structuredClone(emptyMetadata),
        copies: [
            punched('B', b),
            punched('D', [...c, ...accents(3100, 6)]),
            punched('E', [...c, ...accents(4100, 5)]),
            punched('F', [...base, ...accents(5000, 4)])
        ],
        versions: []
    }
}

describe('the options as typed', () => {
    it('start at the values the edition of WM 225 is reproduced with', () => {
        expect(optionsOf(defaultTyping(), true)).toEqual({
            options: { costs: defaultCosts, movedWithin: 25, margin: 3, sameText: 3, pin: true }
        })
    })

    it('name the fields that spell no amount', () => {
        const typed = { ...defaultTyping(), gain: '', transferLoss: '-1', margin: '1e' }
        expect(optionsOf(typed, false)).toEqual({ invalid: ['gain', 'transferLoss', 'margin'] })
    })

    it('let a copy deviate at no price at all, and nothing else', () => {
        expect(parseAmount('copyDeviation', '∞')).toBe(Infinity)
        expect(parseAmount('copyDeviation', ' Infinity ')).toBe(Infinity)
        expect(parseAmount('gain', '∞')).toBeUndefined()
    })

    it('count the readings copies of one text may differ in by whole numbers', () => {
        expect(parseAmount('sameText', '0')).toBe(0)
        expect(parseAmount('sameText', '2.5')).toBeUndefined()
        expect(parseAmount('sameText', '∞')).toBeUndefined()
    })
})

describe('what the dialog says in words', () => {
    it('ends a refusal with a full stop, once', () => {
        expect(asSentence('A stemma needs at least two copies with features')).toBe('A stemma needs at least two copies with features.')
        expect(asSentence('Done.')).toBe('Done.')
    })

    it('reads an amount to two places, and an unbounded one as such', () => {
        expect(amount(140.0625)).toBe('140.06')
        expect(amount(29)).toBe('29')
        expect(amount(Infinity)).toBe('∞')
    })

    it('lists names as a sentence does', () => {
        expect(listed(['St2'])).toBe('St2')
        expect(listed(['St2', 'Ch1'])).toBe('St2 and Ch1')
        expect(listed(['St2', 'Ch1', 'Bo1'])).toBe('St2, Ch1 and Bo1')
    })

    it('says what a grouping holds the copies to', () => {
        const name = (copy: string) => copy.toUpperCase()
        expect(supportLabel({ copies: ['d', 'e'], margin: 29 }, name))
            .toBe('D and E derive from one lost or common version')
        expect(supportLabel({ copies: ['b', 'd', 'e'], ancestor: ['b'], margin: 4 }, name))
            .toBe('B carries the version D and E derive from')
        expect(supportLabel({ copies: ['b', 'd'], ancestor: ['b'], margin: 4 }, name))
            .toBe('B carries the version D derives from')
        expect(supportLabel({ copies: ['b', 'b2', 'd'], ancestor: ['b', 'b2'], margin: 4 }, name))
            .toBe('B and B2 carry the version D derives from')
    })

    it('says how firmly the copies decide it', () => {
        expect(marginLabel(3.75)).toBe('+3.75: the best stemma without it costs that much more')
        expect(marginLabel(Infinity)).toBe('No stemma without it is admissible')
    })

    it('names a reading by the note it sounds or the command it gives, and where it lies', () => {
        expect(meaningLabel({ type: 'note', pitch: 61 })).toBe('C♯4')
        expect(meaningLabel({ type: 'expression', expressionType: 'MezzoforteOff', scope: 'bass' })).toBe('Mezzoforte off, bass')
        expect(readingRow({
            id: 'r',
            meaning: { type: 'note', pitch: 60 },
            key: 'note 60',
            carriers: ['h1', 'h2'],
            copies: ['b', 'd'],
            place: { unit: 'mm', from: 1242.5200372, to: 1254.94 }
        } as Parameters<typeof readingRow>[0], name => name.toUpperCase())).toEqual({
            reading: 'r', meaning: 'C4', place: '1242.5 mm', copies: ['B', 'D']
        })
    })
})

/** The fixture with a third version C based on A, from which B now derives, and B striking nothing. */
const restemmed = (edition: Edition): Edition => produce(edition, draft => {
    const b = draft.versions.find(version => version.id === ids.b)!
    b.basedOn = [assignReference('C')]
    b.edits = []
    const c: Version = { id: 'C', system: b.system, edits: [], motivations: [], basedOn: [assignReference(ids.a)] }
    draft.versions.push(c)
})

describe('the changes adopting makes, version by version', () => {
    it('are none where the stemma stays as it is', () => {
        const edition = fixtureEdition()
        const rows = changeRows(edition, edition)
        expect(rows.map(row => row.changed)).toEqual([false, false])
        expect(rows[0]).toMatchObject({ siglum: 'R1', parentBefore: null, parentAfter: null, inserted: { kept: 5, gone: 0, added: 0 } })
    })

    it('tell what a version derives from before and after, and what it strikes no more', () => {
        const edition = fixtureEdition()
        const after = restemmed(edition)
        const sigla = siglaOf(after)
        const b = changeRows(edition, after).find(row => row.version === ids.b)!
        expect(b).toMatchObject({
            siglum: 'r2',
            parentBefore: 'R1',
            parentAfter: sigla.get('C'),
            moved: true,
            deleted: { kept: 0, gone: 1, added: 0 },
            changed: true
        })
    })

    it('mark a version the edition does not have yet', () => {
        const edition = fixtureEdition()
        const c = changeRows(edition, restemmed(edition)).find(row => row.version === 'C')!
        expect(c.only).toBe('after')
        expect(c.parentBefore).toBeUndefined()
        expect(c.parentAfter).toBe('R1')
        expect(c.changed).toBe(true)
    })

    it('mark a version that goes', () => {
        const edition = fixtureEdition()
        const without = produce(edition, draft => { draft.versions = draft.versions.filter(version => version.id !== ids.b) })
        const b = changeRows(edition, without).find(row => row.version === ids.b)!
        expect(b).toMatchObject({ only: 'before', parentBefore: 'R1', changed: true })
        expect(b.parentAfter).toBeUndefined()
    })
})

describe('a stemma proposed for an edition that states none', () => {
    const edition = tradition()
    const proposal = proposeStemma(edition)
    const preview = produce(edition, adoptStemma(proposal))

    it('is the descent the copies were punched from', () => {
        expect(proposal.notation).toBe('*(B(*(D,E)),F)')
    })

    it('names every version it posits as the adopted stemma does, the lost ones in lowercase', () => {
        const name = proposedNames(proposal, edition, preview)
        const names = proposal.versions.map(proposed => name(proposed.id))
        expect(new Set(names).size).toBe(proposal.versions.length)
        expect(names.every(one => [...siglaOf(preview).values()].includes(one))).toBe(true)
        proposal.versions.forEach((proposed, index) => {
            const siglum = names[index]!
            expect(siglum === siglum.toLowerCase()).toBe(proposed.copies.length === 0)
        })
    })

    it('makes every version a new one', () => {
        const rows = changeRows(edition, preview)
        expect(rows).toHaveLength(6)
        expect(rows.every(row => row.only === 'after' && row.changed)).toBe(true)
        expect(rows.filter(row => row.parentAfter === null)).toHaveLength(1)
    })

    it('lets no reading arise twice', () => {
        expect(conflictRows(proposal, copyNames(edition), proposedNames(proposal, edition, preview))).toEqual([])
    })
})

describe('an edit of the editor\'s that is not kept', () => {
    it('is told with its version and the motivation it was given', () => {
        const edition = produce(fixtureEdition(), draft => {
            const b = draft.versions.find(version => version.id === ids.b)!
            b.motivations.push({ type: 'motivation', id: 'accent', note: 'The accent is taken back.' })
            b.edits![0]!.motivation = 'accent'
        })
        expect(unpinnedRows([{ edit: 'edit-b', version: ids.b, reason: 'version-gone' }], edition)).toEqual([{
            edit: 'edit-b',
            version: 'r2',
            reason: 'No version of the proposal stands for its version',
            motivation: 'The accent is taken back.'
        }])
    })
})

describe('copies carrying one text', () => {
    /** The tradition with a second pressing of D that lacks one hole. */
    const withPressing = (): Edition => {
        const edition = tradition()
        const d = edition.copies.find(copy => copy.siglum === 'D')!
        const produced = d.production!.produced!.filter((_, index) => index !== 7)
            .map(feature => ({ ...feature, id: `D2-${feature.id}` }))
        return { ...edition, copies: [...edition.copies, { ...d, id: 'd2', siglum: 'D2', production: { ...d.production, produced } }] }
    }

    it('are named together, with how far apart they are', () => {
        const edition = withPressing()
        const proposal = proposeStemma(edition)
        expect(textRows(proposal, copyNames(edition))).toEqual([{ copies: ['D', 'D2'], differences: 1, stated: false }])
        expect(readingsApart(1)).toBe('1 reading apart')
        expect(readingsApart(148)).toBe('148 readings apart')
    })

    it('tell which of them lacks a reading of the version they carry', () => {
        const edition = withPressing()
        const proposal = proposeStemma(edition)
        const preview = produce(edition, adoptStemma(proposal))
        const rows = deviationRows(proposal, copyNames(edition), proposedNames(proposal, edition, preview))
        expect(rows.map(row => row.copy)).toEqual(['D2'])
    })
})
