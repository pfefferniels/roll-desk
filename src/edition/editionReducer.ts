import { applyPatches, enableMapSet, enablePatches, Patch, produceWithPatches } from "immer";
import { Edition, EditionOp } from "linked-rolls";

// Producing patches and drafting Maps are immer plugins, and this module is
// where the edition is produced, so they are switched on with it.
enablePatches();
enableMapSet();

/** What one edit changed, and the patches that take it back. */
type HistoryEntry = { patches: Patch[]; inverse: Patch[] };

export type EditionState = {
    edition?: Edition;
    past: HistoryEntry[];
    future: HistoryEntry[];
};

export type EditionAction =
    | { type: 'set'; edition: Edition }
    | { type: 'apply'; op: EditionOp }
    | { type: 'undo' }
    | { type: 'redo' };

const historyLimit = 300;

export const editionState = (edition?: Edition): EditionState => ({ edition, past: [], future: [] });

/**
 * Holds the edition together with the patches it can be walked back and
 * forward through, so that an edit and its history entry are one transition.
 * Being a reducer, it may be called more than once for a dispatch: only the
 * state it returns is kept, and nothing outside it is written.
 */
export const editionReducer = (state: EditionState, action: EditionAction): EditionState => {
    switch (action.type) {
        case 'set':
            return { ...state, edition: action.edition };

        case 'apply': {
            const [edition, patches, inverse] = produceWithPatches(state.edition, action.op);
            return {
                edition,
                past: [...state.past, { patches, inverse }].slice(-historyLimit),
                future: []
            };
        }

        case 'undo': {
            const entry = state.past.at(-1);
            if (!state.edition || !entry) return state;
            return {
                edition: applyPatches(state.edition, entry.inverse),
                past: state.past.slice(0, -1),
                future: [...state.future, entry]
            };
        }

        case 'redo': {
            const entry = state.future.at(-1);
            if (!state.edition || !entry) return state;
            return {
                edition: applyPatches(state.edition, entry.patches),
                past: [...state.past, entry],
                future: state.future.slice(0, -1)
            };
        }
    }
};
