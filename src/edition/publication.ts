/**
 * Where the published edition is kept. The welte225.org repository
 * publishes it and keeps every state it was ever published in, so a
 * citation can name the commit whose file the reader saw, beside the
 * version the edition states of itself.
 */

import { createContext } from "react"

export interface Publication {
    /** Where the desk reads the edition. */
    url: string
    /** The GitHub repository that keeps the file's history, as owner/name. */
    repository: string
    /** The file's path in the repository. */
    path: string
}

export const publishedEdition: Publication = {
    url: 'https://welte225.org/edition.jsonld',
    repository: 'pfefferniels/welte225.org',
    path: 'edition.jsonld'
}

/** The published edition as the desk read it: where from, and the git object id of the bytes it got. */
export interface ReadPublication extends Publication {
    blob?: string
}

/** What the desk read, or nothing where it shows an edition that was opened or written here. */
export const PublicationContext = createContext<ReadPublication | undefined>(undefined)

/** A commit of the repository, with the day it was made. */
export interface Commit {
    sha: string
    date: Date
    repository: string
    /** The file as it stood in this commit. */
    url: string
}

/**
 * The id git gives the bytes as a blob, which the repository's trees
 * name every file by. Nothing where the browser offers no digest, as
 * outside a secure context.
 */
export const blobIdOf = async (bytes: Uint8Array): Promise<string | undefined> => {
    if (!globalThis.crypto?.subtle) return undefined

    const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`)
    const object = new Uint8Array(header.byteLength + bytes.byteLength)
    object.set(header)
    object.set(bytes, header.byteLength)

    const digest = await crypto.subtle.digest('SHA-1', object)
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** A commit as GitHub lists it, with what is needed of it here. */
interface ListedCommit {
    sha: string
    commit: { tree: { sha: string }, committer: { date: string } }
}

/** A tree as GitHub gives it: the entries of one directory. */
interface Tree {
    tree: { path: string, type: string, sha: string }[]
}

/** How many of the latest commits touching the file are asked whether they hold what the desk read. */
const lookBack = 5

const github = async <T>(route: string): Promise<T> => {
    const response = await fetch(`https://api.github.com/repos/${route}`, {
        headers: { Accept: 'application/vnd.github+json' }
    })
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`)
    return await response.json() as T
}

/** The blob the file is in the tree, walking down to it a directory at a time. */
const blobIn = async (repository: string, tree: string, path: string): Promise<string | undefined> => {
    const [name, ...rest] = path.split('/')
    const { tree: entries } = await github<Tree>(`${repository}/git/trees/${tree}`)
    const entry = entries.find(entry => entry.path === name)
    if (!entry) return undefined
    if (rest.length === 0) return entry.type === 'blob' ? entry.sha : undefined
    return entry.type === 'tree' ? blobIn(repository, entry.sha, rest.join('/')) : undefined
}

/**
 * The commit whose file is the one the desk read: among the last few
 * that touched it, since the site may still serve a state just
 * replaced. Nothing where none of them holds those bytes. Throws where
 * GitHub cannot be asked.
 */
const findCommit = async ({ repository, path, blob }: Required<ReadPublication>): Promise<Commit | undefined> => {
    const commits = await github<ListedCommit[]>(`${repository}/commits?path=${encodeURIComponent(path)}&per_page=${lookBack}`)
    for (const commit of commits) {
        if (await blobIn(repository, commit.commit.tree.sha, path) !== blob) continue
        return {
            sha: commit.sha,
            date: new Date(commit.commit.committer.date),
            repository,
            url: `https://github.com/${repository}/blob/${commit.sha}/${path}`
        }
    }
    return undefined
}

const asked = new Map<string, Promise<Commit | undefined>>()

/**
 * The commit holding what the desk read, asked of GitHub once a
 * session. Nothing where the desk could not tell what it read.
 */
export const commitOf = (publication: ReadPublication): Promise<Commit | undefined> => {
    const { blob } = publication
    if (!blob) return Promise.resolve(undefined)

    const key = `${publication.repository}/${publication.path}@${blob}`
    const known = asked.get(key)
    if (known) return known

    const asking = findCommit({ ...publication, blob })
    // Asked again next time where GitHub could not be reached.
    asking.catch(() => asked.delete(key))
    asked.set(key, asking)
    return asking
}
