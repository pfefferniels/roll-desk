import { useContext, useMemo } from "react"
import { AnySymbol, snapshotOf } from "linked-rolls"
import { EditionContext } from "../providers/EditionContext"

const none: readonly AnySymbol[] = []

/** The symbols in force at a version, recomputed only when the edition changes. */
export const useSnapshot = (versionId?: string): readonly AnySymbol[] => {
    const { edition } = useContext(EditionContext)
    return useMemo(
        () => (edition && versionId) ? snapshotOf(edition, versionId) : none,
        [edition, versionId]
    )
}
