import { useMemo, useContext } from "react";
import { EditionContext } from "../providers/EditionContext";
import { AnyArgumentation, Assumption, Certainty, Path, addReason, clearBelief, createBelief, getAt, removeReason, setCertainty } from "linked-rolls";

export function useAssumption(path: Path) {
    const { edition, apply } = useContext(EditionContext);

    const assumption = useMemo(
        () => getAt<Assumption>(path, edition),
        [edition, path]
    );

    return {
        assumption,
        createBelief: () => apply(createBelief(path)),
        clearBelief: () => apply(clearBelief(path)),
        setCertainty: (c: Certainty) => apply(setCertainty(path, c)),
        addReason: (r: AnyArgumentation) => apply(addReason(path, r)),
        removeReason: (index: number) => apply(removeReason(path, index)),
    };
}
