import { useMemo, useContext } from "react";
import { getAt, onPath, type PathTo, type PathValue } from "../helpers/path";
import { EditionContext, EditionOp } from "../providers/EditionContext";
import { Draft } from "immer";
import { Edition, EditorialAssumption, Certainty, AnyArgumentation } from "linked-rolls";
import { v4 } from "uuid";

export type AssumptionPath = PathTo<Edition, EditorialAssumption<any, any>>;

export const onAssumptionAt =
    <P extends AssumptionPath>(
        path: P,
        op: (a: Draft<EditorialAssumption<any, any>>, d: Draft<Edition>) => void
    ): EditionOp =>
        d =>
            onPath<Edition, P>(path, (node, root) => {
                op(node as Draft<EditorialAssumption<any, any>>, root);
            })(d);

const createBelief = <P extends AssumptionPath>(path: P): EditionOp =>
    onAssumptionAt(path, a => {
        a.belief = { type: "belief", id: v4(), certainty: "true", reasons: [] };
    });

const clearBelief = <P extends AssumptionPath>(path: P): EditionOp =>
    onAssumptionAt(path, a => {
        a.belief = undefined;
    });

const setCertainty =
    <P extends AssumptionPath>(path: P, c: Certainty): EditionOp =>
        onAssumptionAt(path, a => {
            if (a.belief) a.belief.certainty = c;
        });

const addReason =
    <P extends AssumptionPath>(path: P, reason: AnyArgumentation): EditionOp =>
        onAssumptionAt(path, a => {
            a.belief?.reasons.push(reason);
        });

const removeReason =
    <P extends AssumptionPath>(path: P, index: number): EditionOp =>
        onAssumptionAt(path, a => {
            a.belief?.reasons.splice(index, 1);
        });


export function useAssumption<P extends AssumptionPath>(path: P) {
    const { edition, apply } = useContext(EditionContext);

    const assumption = useMemo(
        () => getAt<Edition, P>(path, edition) as PathValue<Edition, P> | undefined,
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
