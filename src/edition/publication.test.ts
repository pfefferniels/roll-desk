import { afterEach, describe, expect, it, vi } from 'vitest'
import { blobIdOf, commitOf } from './publication'

describe('the blob id of what the desk read', () => {
    it('is the id git gives the bytes', async () => {
        // git hash-object of a file holding "hello\n"
        expect(await blobIdOf(new TextEncoder().encode('hello\n')))
            .toBe('ce013625030ba8dba906f756967f9e9ca394464a')
    })
})

/** A repository in which the file was changed twice: `new` holds blob `b2`, `old` blob `b1`. */
const github = (url: string) => {
    const route = url.replace('https://api.github.com/repos/owner/name/', '')
    const answers: Record<string, unknown> = {
        'commits?path=edition.jsonld&per_page=5': [
            { sha: 'new', commit: { tree: { sha: 'tree-new' }, committer: { date: '2026-10-02T08:00:00Z' } } },
            { sha: 'old', commit: { tree: { sha: 'tree-old' }, committer: { date: '2026-09-29T08:00:00Z' } } }
        ],
        'git/trees/tree-new': { tree: [{ path: 'edition.jsonld', type: 'blob', sha: 'b2' }] },
        'git/trees/tree-old': { tree: [{ path: 'edition.jsonld', type: 'blob', sha: 'b1' }] }
    }
    const answer = answers[route]
    return Promise.resolve(answer
        ? new Response(JSON.stringify(answer), { status: 200 })
        : new Response('', { status: 404 }))
}

const publication = (blob?: string) => ({
    url: 'https://example.org/edition.jsonld',
    repository: 'owner/name',
    path: 'edition.jsonld',
    blob
})

describe('the commit holding what the desk read', () => {
    afterEach(() => { vi.unstubAllGlobals() })

    it('is the latest one where that is what the site serves', async () => {
        vi.stubGlobal('fetch', vi.fn(github))
        expect(await commitOf(publication('b2'))).toMatchObject({
            sha: 'new',
            date: new Date('2026-10-02T08:00:00Z'),
            url: 'https://github.com/owner/name/blob/new/edition.jsonld'
        })
    })

    it('is an earlier one where the site still serves the state before', async () => {
        vi.stubGlobal('fetch', vi.fn(github))
        expect(await commitOf(publication('b1'))).toMatchObject({ sha: 'old' })
    })

    it('is none where no recent commit holds those bytes', async () => {
        vi.stubGlobal('fetch', vi.fn(github))
        expect(await commitOf(publication('edited'))).toBeUndefined()
    })

    it('is not asked for where the desk could not tell what it read', async () => {
        const fetch = vi.fn(github)
        vi.stubGlobal('fetch', fetch)
        expect(await commitOf(publication())).toBeUndefined()
        expect(fetch).not.toHaveBeenCalled()
    })

    it('is asked again after GitHub could not be reached', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 403 }))))
        await expect(commitOf(publication('unreachable'))).rejects.toThrow('403')

        vi.stubGlobal('fetch', vi.fn(github))
        expect(await commitOf(publication('unreachable'))).toBeUndefined()
    })
})
