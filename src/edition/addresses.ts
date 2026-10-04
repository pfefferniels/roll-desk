/**
 * How the edition is addressed. Every entity of it carries an id, and its
 * IRI is that id under the edition's base. The desk shows an entity at the
 * path of its IRI, so that the address bar, the reference a reader cites
 * and the link they were given all say the same thing.
 */

import { AnyFeature, AnySymbol, Edit, Edition, Motivation, Path, isEdit, isRollFeature, isSymbol, getAt, idsIn, pathIn } from "linked-rolls"
import { HeldMotivation, isHeldMotivation, isMotivation } from "./motivation"
import type { UserSelection } from "../desk/RollDesk"

/** The address of the entity under the id, which a link can carry as its href. */
export const pathOf = (id: string) => `/${encodeURIComponent(id)}`

/** The address of the edition's title page, which the desk shows with nothing open. */
export const titlePath = '/'

/** The entity an address names, or nothing where it names none. */
export const entityOfPath = (pathname: string): string | undefined => {
    const [first, second, ...rest] = pathname.split('/').filter(segment => segment.length > 0)
    if (first === undefined || rest.length > 0) return undefined
    if (second === undefined) return decodeURIComponent(first)

    // Links given out before a copy was named by its id alone.
    return first === 'copy' ? decodeURIComponent(second) : undefined
}

/** What the desk has open, as far as an address is concerned. */
export interface DeskAddress {
    versionId?: string
    copyId?: string
    selection: readonly UserSelection[]
}

/**
 * Whether a link by this id would land on the motivation meant. A
 * collation writes `unchecked` on what it makes, so several versions
 * carry a motivation of that name and the id names none of them in
 * particular.
 */
const namesOneMotivation = (edition: Edition, id: string) =>
    edition.versions.filter(version => version.motivations.some(m => m.id === id)).length === 1

/**
 * The address of what the desk shows: the one entity selected, or else
 * the version or copy it lies on. Nothing where the desk shows nothing,
 * so that an address is never written over with an empty one; the title
 * page is gone to by its own address instead.
 *
 * A motivation whose id other versions write as well falls back to its
 * version, since the id alone would send a reader to another roll.
 */
export const deskPath = (edition: Edition, { versionId, copyId, selection }: DeskAddress): string | undefined => {
    const [sole] = selection.length === 1 ? selection : []
    if (isHeldMotivation(sole) && namesOneMotivation(edition, sole.motivation.id)) {
        return pathOf(sole.motivation.id)
    }
    if (sole && 'id' in sole) return pathOf(sole.id)
    if (versionId) return pathOf(versionId)
    if (copyId) return pathOf(copyId)
    return undefined
}

/** How many characters of a UUID an address keeps at the least. */
const shortest = 8

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The shortest address of the entity: its id cut after the first eight
 * characters of the UUID it carries, or after as many more as tell it
 * from every other id of the edition. An id that is a word is not cut.
 */
export const shortPathOf = (edition: Edition, id: string): string => {
    const at = uuid.exec(id)?.index
    if (at === undefined) return pathOf(id)

    const others = [...idsIn(edition)].filter(other => other !== id)
    for (let length = at + shortest; length < id.length; length++) {
        const start = id.slice(0, length)
        if (!others.some(other => other.startsWith(start))) return pathOf(start)
    }
    return pathOf(id)
}

/**
 * The id an address names: the id itself, or the one id it is the start
 * of, where that start runs to eight characters at least. Nothing where
 * the edition holds no such id, or more than one.
 */
export const idNamed = (edition: Edition, named: string): string | undefined => {
    if (pathIn(edition, named)) return named
    if (named.length < shortest) return undefined

    const [only, ...more] = [...idsIn(edition)].filter(id => id.startsWith(named))
    return more.length === 0 ? only : undefined
}

/** The IRI an entity is cited by: its address under the edition's base. */
export const referenceOf = (path: string, base: string) =>
    new URL(path.replace(/^\//, ''), base).toString()

/** An entity the desk draws, and can therefore mark. */
export type Drawn = AnySymbol | AnyFeature | Edit | Motivation

const isDrawn = (entity: unknown): entity is Drawn =>
    typeof entity === 'object' && entity !== null &&
    (isSymbol(entity) || isEdit(entity) || isMotivation(entity) || isRollFeature(entity))

/** What a link marks on the desk: the entity, a motivation as one of the version holding it. */
export type Mark = AnySymbol | AnyFeature | Edit | HeldMotivation

/** The id the mark is drawn under, which for a motivation is the one its edits carry. */
export const idOfMark = (mark: Mark) => isHeldMotivation(mark) ? mark.motivation.id : mark.id

/** Where an entity is to be found: on a version, on a copy, or in the edition's own statements. */
export type LinkTarget =
    | { on: 'version', versionId: string, mark?: Mark }
    | { on: 'copy', copyId: string, mark?: Mark }
    | { on: 'edition' }

/** The entity's own path and those of everything it belongs to, the entity last. */
const ancestry = (path: Path): Path[] => path.map((_, depth) => path.slice(0, depth + 1))

/** The most particular thing the desk draws around the entity, the entity itself included. */
const drawnAt = (edition: Edition, path: Path): Drawn | undefined =>
    ancestry(path).map(step => getAt<unknown>(step, edition)).findLast(isDrawn)

/** What is marked for what was drawn, a motivation taking the version it belongs to with it. */
const markOf = (drawn: Drawn | undefined, versionId?: string): Mark | undefined => {
    if (!isMotivation(drawn)) return drawn
    return versionId ? { versionId, motivation: drawn } : undefined
}

/**
 * What a link to an entity opens, or nothing where the edition holds no
 * such entity.
 *
 * Everything with an id is addressable, and what is asked for is not
 * always something the desk draws: a belief or an annotation marks
 * whatever it is said about, and an entity belonging to no version and no
 * copy is a statement of the edition about itself.
 */
export const linkTarget = (edition: Edition, id: string): LinkTarget | undefined => {
    const path = pathIn(edition, id)
    if (!path) return undefined

    const [collection, index] = path
    const drawn = drawnAt(edition, path)

    if (typeof index === 'number') {
        const version = collection === 'versions' ? edition.versions[index] : undefined
        if (version) return { on: 'version', versionId: version.id, mark: markOf(drawn, version.id) }

        const copy = collection === 'copies' ? edition.copies[index] : undefined
        if (copy) return { on: 'copy', copyId: copy.id, mark: markOf(drawn) }
    }

    return { on: 'edition' }
}
