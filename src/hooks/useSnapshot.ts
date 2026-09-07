import { useContext, useMemo } from "react"
import { AnySymbol } from "linked-rolls"
import { EditionContext } from "../providers/EditionContext"

const none: readonly AnySymbol[] = []

/** The symbols in force at a version, recomputed only when the edition changes. */
export const useSnapshot = (versionId?: string): readonly AnySymbol[] => {
    const { view } = useContext(EditionContext)
    return useMemo(
        () => (view && versionId) ? view.snapshot(versionId) : none,
        [view, versionId]
    )
}
