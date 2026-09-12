/**
 * How the edition is addressed. Every entity of it carries an id, and its
 * IRI is that id under the edition's base. The desk shows an entity at the
 * path of its IRI, so that the address bar, the reference a reader cites
 * and the link they were given all say the same thing.
 */

import { AnyFeature, AnySymbol, Edit, EditionView, Motivation, Path, isEdit, isRollFeature, isSymbol } from "linked-rolls"
import { isMotivation } from "./motivation"
import type { UserSelection } from "../components/roll-desk/RollDesk"

const pathOf = (id: string) => `/${encodeURIComponent(id)}`

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
 * The address of what the desk shows: the one entity selected, or else
 * the version or copy it lies on. Nothing where the desk shows nothing,
 * so that an address is never written over with an empty one.
 */
export const deskPath = ({ versionId, copyId, selection }: DeskAddress): string | undefined => {
    const [sole] = selection.length === 1 ? selection : []
    if (sole && 'id' in sole) return pathOf(sole.id)
    if (versionId) return pathOf(versionId)
    if (copyId) return pathOf(copyId)
    return undefined
}

/** The IRI an entity is cited by: its address under the edition's base. */
export const referenceOf = (path: string, base: string) =>
    new URL(path.replace(/^\//, ''), base).toString()

/** An entity the desk draws, and can therefore mark. */
export type Drawn = AnySymbol | AnyFeature | Edit | Motivation

const isDrawn = (entity: unknown): entity is Drawn =>
    typeof entity === 'object' && entity !== null &&
    (isSymbol(entity) || isEdit(entity) || isMotivation(entity) || isRollFeature(entity))

/** Where an entity is to be found: on a version, on a copy, or in the edition's own statements. */
export type LinkTarget =
    | { on: 'version', versionId: string, mark?: Drawn }
    | { on: 'copy', copyId: string, mark?: Drawn }
    | { on: 'edition' }

/** The entity's own path and those of everything it belongs to, the entity last. */
const ancestry = (path: Path): Path[] => path.map((_, depth) => path.slice(0, depth + 1))

/** The most particular thing the desk draws around the entity, the entity itself included. */
const drawnAt = (view: EditionView, path: Path): Drawn | undefined =>
    ancestry(path).map(step => view.atPath<unknown>(step)).findLast(isDrawn)

/**
 * What a link to an entity opens, or nothing where the edition holds no
 * such entity.
 *
 * Everything with an id is addressable, and what is asked for is not
 * always something the desk draws: a belief or an annotation marks
 * whatever it is said about, and an entity belonging to no version and no
 * copy is a statement of the edition about itself.
 */
export const linkTarget = (view: EditionView, id: string): LinkTarget | undefined => {
    const path = view.getPath(id)
    if (!path) return undefined

    const [collection, index] = path
    const mark = drawnAt(view, path)

    if (typeof index === 'number') {
        const version = collection === 'versions' ? view.edition.versions[index] : undefined
        if (version) return { on: 'version', versionId: version.id, mark }

        const copy = collection === 'copies' ? view.edition.copies[index] : undefined
        if (copy) return { on: 'copy', copyId: copy.id, mark }
    }

    return { on: 'edition' }
}
