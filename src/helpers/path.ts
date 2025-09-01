import type { Draft } from "immer";
import { getAt, Path, PathValue } from "linked-rolls";

export function onPath<T, P extends Path<T>>(
    path: P,
    op: (node: Draft<PathValue<T, P>>, root: Draft<T>) => void
) {
    return (root: Draft<T>) => {
        const node = getAt<T, P>(path, root);
        if (node !== undefined) op(node as any, root);
    };
}
