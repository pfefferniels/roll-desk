import { AnyArgumentation, Edition } from "linked-rolls"
import { linkTarget } from "./addresses"
import { nameOf } from "./names"

/** What a reason is introduced as, where its kind is worth saying. A plain argument needs no word before it. */
export const reasonLabels: Record<AnyArgumentation['type'], string | undefined> = {
    simpleArgumentation: undefined,
    inference: 'Inference',
    beliefAdoption: 'Adopted from',
    meaningComprehension: 'Meaning comprehension',
    measurement: 'Measurement'
}

/** Who gave the reason, where a name is given. The editor writes an actor nobody named as a blank name. */
export const actorOf = (reason: AnyArgumentation): string | undefined =>
    reason.actor?.name.trim() || undefined

/** Something a reason cites: an entity of the edition, a page on the web, or an id nothing answers to. */
export type Citation =
    | { kind: 'entity', id: string, label: string }
    | { kind: 'web', href: string, label: string }
    | { kind: 'unknown', label: string }

/** The address on the web the text gives, or nothing where it gives none. */
export const webAddressOf = (id: string): URL | undefined => {
    const url = URL.canParse(id) ? new URL(id) : undefined
    return url && (url.protocol === 'https:' || url.protocol === 'http:') ? url : undefined
}

/** The version or copy the entity lies on, by name. */
const placeOf = (edition: Edition, id: string): string | undefined => {
    const target = linkTarget(edition, id)
    if (target?.on === 'version') return nameOf(edition, target.versionId)
    if (target?.on === 'copy') return nameOf(edition, target.copyId)
    return undefined
}

/**
 * What an entry of a reason's `used` or `premises` cites, as a reader can
 * follow it. A web address is named by the last segment of its path,
 * which says which file it is.
 */
export const citationOf = (edition: Edition, id: string): Citation => {
    const url = webAddressOf(id)
    if (url) return { kind: 'web', href: id, label: url.pathname.split('/').filter(Boolean).at(-1) ?? url.host }

    const name = nameOf(edition, id)
    if (name) return { kind: 'entity', id, label: name }

    const place = placeOf(edition, id)
    return place ? { kind: 'entity', id, label: `on ${place}` } : { kind: 'unknown', label: id }
}
