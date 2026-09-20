import { describe, expect, it } from 'vitest'
import { assignReference, Belief, Certainty, connectVersions, Edition, KeeperAssignment, mm, RollCopy, stateCarriage } from 'linked-rolls'
import { produce } from 'immer'
import { copyAccount, versionAccount } from './account'
import { fixtureEdition, hole, ids, note, viewOf } from './editionFixture'

const belief = (certainty: Certainty): Belief => ({ type: 'belief', id: `belief-${certainty}`, certainty, reasons: [] })

const recorded = (): RollCopy => ({
    type: 'RollCopy',
    id: 'recorded',
    ops: [],
    measurements: {},
    conditions: [],
    modifications: [],
    readFrom: { kind: 'recording' }
})

/** The fixture with a recorded copy stating what it carries, each under the certainty given. */
const stating = (...statements: [string, Certainty][]): Edition =>
    statements.reduce(
        (next, [versionId, certainty]) => produce(next, stateCarriage('recorded', versionId, belief(certainty))),
        { ...fixtureEdition(), copies: [...fixtureEdition().copies, recorded()] }
    )

describe('the account of a version', () => {
    it('names the derivation the text is read against first, then the hypotheses', () => {
        const edition = fixtureEdition()
        const [a, b] = edition.versions
        if (!a || !b) throw new Error('the fixture has changed')
        b.basedOn = [{ ...assignReference(ids.a), '@annotation': { id: 'doubted', belief: belief('possible') } }, assignReference('C')]
        edition.versions.push({ ...a, id: 'C', edits: [] })

        expect(versionAccount(viewOf(edition), ids.b)?.derivations.map(({ parent, principal }) => [parent, principal]))
            .toEqual([['C', true], ['A', false]])
    })

    it('carries the window each derivation states, and none where it states one for another', () => {
        const edition = fixtureEdition()
        const tolerance = { toleranceStart: mm(3.5), toleranceEnd: mm(5) }
        const collated = produce(edition, connectVersions(viewOf(edition), ids.b, ids.a, tolerance))

        const [derivation] = versionAccount(viewOf(collated), ids.b)?.derivations ?? []

        expect(derivation?.collationTolerance).toEqual(tolerance)
        expect(versionAccount(viewOf(collated), ids.a)?.derivations).toEqual([])
    })

    it('gives the witnesses by perforations first, then by statement with their beliefs', () => {
        const account = versionAccount(viewOf(stating(['A', 'likely'])), ids.a)

        expect(account?.witnesses).toEqual([
            { copy: 'copy', by: 'carriers' },
            { copy: 'recorded', by: 'statement', certainty: 'likely', belief: belief('likely') }
        ])
        expect(account?.indirect).toEqual([])
    })

    it('holds a copy reaching the version through a later one apart from the rest', () => {
        const edition = fixtureEdition()
        const copy = edition.copies[0]
        if (!copy) throw new Error('the fixture has changed')
        copy.production?.produced?.push(hole('hole-added', 1200, 1210, 51))
        edition.versions[1]?.edits?.push({ type: 'edit', id: 'edit-added', insert: [note('note-64', 64, 'hole-added')] })
        const account = versionAccount(viewOf(edition), ids.a)

        expect(account?.witnesses).toEqual([])
        expect(account?.indirect).toEqual([{ copy: 'copy', by: 'carriers', through: ids.b }])
        expect(versionAccount(viewOf(edition), ids.b)?.witnesses).toEqual([{ copy: 'copy', by: 'carriers' }])
    })

    it('is none for anything but a version', () => {
        expect(versionAccount(viewOf(fixtureEdition()), 'copy')).toBeUndefined()
        expect(versionAccount(viewOf(fixtureEdition()), 'missing')).toBeUndefined()
    })
})

describe('the account of a copy', () => {
    it('gives what its perforations carry', () => {
        expect(copyAccount(viewOf(fixtureEdition()), 'copy')?.carriages.map(({ version, by }) => [version, by]))
            .toEqual([['A', 'carriers']])
    })

    it('gives what it is stated to carry, the most certain first', () => {
        const view = viewOf(stating(['B', 'unlikely'], ['A', 'likely']))

        expect(copyAccount(view, 'recorded')?.carriages.map(({ version, certainty }) => [version, certainty]))
            .toEqual([['A', 'likely'], ['B', 'unlikely']])
    })

    it('is none for anything but a copy', () => {
        expect(copyAccount(viewOf(fixtureEdition()), ids.a)).toBeUndefined()
    })

    /** The account argues the keeper along the copy's path, and an Arguable throws where its path names nothing. */
    it('is read at a path that reaches the keeper', () => {
        const view = viewOf(fixtureEdition())
        const path = [...(view.getPath('copy') ?? []), 'keeper']

        expect(view.atPath<KeeperAssignment>(path)?.name).toBe('Test')
    })
})
