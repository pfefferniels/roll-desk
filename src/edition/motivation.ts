import { Motivation } from "linked-rolls"

export const isMotivation = (obj: unknown): obj is Motivation =>
    typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'motivation'

/**
 * A motivation together with the version holding it.
 *
 * An id does not name a motivation on its own. A collation writes
 * `unchecked` on everything it makes, so every version that was
 * collated carries a motivation of that name, and two versions may
 * agree on an id for any other reason as well. The desk therefore marks,
 * counts and addresses a motivation as one of a particular version.
 */
export interface HeldMotivation {
    versionId: string
    motivation: Motivation
}

export const isHeldMotivation = (obj: unknown): obj is HeldMotivation =>
    typeof obj === 'object' && obj !== null &&
    'motivation' in obj && isMotivation(obj.motivation) &&
    'versionId' in obj && typeof obj.versionId === 'string'

/** Whether the two are the one motivation of the one version. */
export const sameMotivation = (one: HeldMotivation, other: HeldMotivation) =>
    one.versionId === other.versionId && one.motivation.id === other.motivation.id
