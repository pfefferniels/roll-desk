import { useMemo, useContext } from "react";
import { EditionContext, EditionOp } from "../providers/EditionContext";
import { Draft } from "immer";
import { Edition, EditorialAssumption, Certainty, AnyArgumentation, getAt, Path } from "linked-rolls";
import { v4 } from "uuid";

export const onAssumptionAt =
    (
        path: Path,
        op: (a: Draft<EditorialAssumption<any, any>>, d: Draft<Edition>) => void
    ): EditionOp =>
        d => {
            const obj = getAt<EditorialAssumption<any, any>>(path, d)
            if (obj) op(obj, d);
        }

const createBelief = (path: Path): EditionOp =>
    onAssumptionAt(path, a => {
        a.belief = { type: "belief", id: v4(), certainty: "true", reasons: [] };
    });

const clearBelief = (path: Path): EditionOp =>
    onAssumptionAt(path, a => {
        a.belief = undefined;
    });

const setCertainty =
    (path: Path, c: Certainty): EditionOp =>
        onAssumptionAt(path, a => {
            if (a.belief) a.belief.certainty = c;
        });

const addReason =
    (path: Path, reason: AnyArgumentation): EditionOp =>
        onAssumptionAt(path, a => {
            a.belief?.reasons.push(reason);
        });

const removeReason =
    (path: Path, index: number): EditionOp =>
        onAssumptionAt(path, a => {
            a.belief?.reasons.splice(index, 1);
        });


export function useAssumption(path: Path) {
    const { edition, apply } = useContext(EditionContext);

    const assumption = useMemo(
        () => getAt<EditorialAssumption<any, any>>(path, edition),
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
