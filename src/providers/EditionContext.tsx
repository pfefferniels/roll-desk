import { assignDate, Edition, EditionMetadata, EditionOp } from "linked-rolls";
import { createContext, useReducer } from "react";
import { editionReducer, editionState } from "./editionReducer";

export type { EditionOp }

export const emptyMetadata: EditionMetadata = {
    title: '',
    license: '',
    base: '',
    creation: {
        editors: [],
        publisher: { name: '', sameAs: [] },
        publicationDate: new Date()
    },
    roll: {
        catalogueNumber: '',
        recordingEvent: {
            recorded: {
                pianist: {
                    name: '',
                    sameAs: []
                },
                playing: ''
            },
            date: assignDate(new Date()),
            place: { name: '', sameAs: [] }
        }
    }
};

/** An edition with nothing on it yet, waiting to be named. */
export const emptyEdition = (): Edition => ({
    versions: [],
    copies: [],
    ...emptyMetadata
});

export const EditionContext = createContext<{
    edition?: Edition;
    setEdition: (edition: Edition) => void;
    apply: (op: EditionOp) => void
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    viewOnly: boolean
}>({
    setEdition: () => { },
    apply: () => { },
    undo: () => { },
    redo: () => { },
    canUndo: false,
    canRedo: false,
    viewOnly: false
});

export function EditionProvider({ edition: existingEdition, children }: { edition?: Edition, children: React.ReactNode }) {
    const [{ edition, past, future }, dispatch] = useReducer(editionReducer, existingEdition, editionState);

    return (
        <EditionContext.Provider value={{
            edition,
            setEdition: (edition) => dispatch({ type: 'set', edition }),
            apply: (op) => dispatch({ type: 'apply', op }),
            undo: () => dispatch({ type: 'undo' }),
            redo: () => dispatch({ type: 'redo' }),
            canUndo: past.length > 0,
            canRedo: future.length > 0,
            viewOnly: !!existingEdition
        }}>
            {children}
        </EditionContext.Provider>
    );
}
