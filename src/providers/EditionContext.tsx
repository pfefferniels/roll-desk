import { assignValue, defaultCollationTolerance, Edition, EditionMetadata, EditionOp, EditionView, systemOf, welteT100 } from "linked-rolls";
import { createContext, useMemo, useReducer } from "react";
import { editionReducer, editionState } from "./editionReducer";

export type { EditionOp }

export const emptyMetadata: EditionMetadata = {
    title: '',
    license: '',
    base: '',
    creation: {
        editors: [],
        publisher: { name: '', sameAs: [] },
        publicationDate: new Date(),
        collationTolerance: { ...defaultCollationTolerance }
    },
    roll: {
        catalogueNumber: '',
        system: systemOf(welteT100),
        recordingEvent: {
            recorded: {
                pianist: {
                    name: '',
                    sameAs: []
                },
                playing: ''
            },
            date: assignValue(new Date()),
            place: { name: '', sameAs: [] }
        }
    }
};

export const EditionContext = createContext<{
    edition?: Edition;
    setEdition: (edition: Edition) => void;
    apply: (op: EditionOp) => void
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    view: EditionView | undefined,
    viewOnly: boolean
}>({
    setEdition: () => { },
    apply: () => { },
    undo: () => { },
    redo: () => { },
    canUndo: false,
    canRedo: false,
    view: undefined,
    viewOnly: false
});

export function EditionProvider({ edition: existingEdition, children }: { edition?: Edition, children: React.ReactNode }) {
    const [{ edition, past, future }, dispatch] = useReducer(editionReducer, existingEdition, editionState);

    const view = useMemo(() => edition && new EditionView(edition), [edition]);

    return (
        <EditionContext.Provider value={{
            edition,
            setEdition: (edition) => dispatch({ type: 'set', edition }),
            apply: (op) => dispatch({ type: 'apply', op }),
            undo: () => dispatch({ type: 'undo' }),
            redo: () => dispatch({ type: 'redo' }),
            canUndo: past.length > 0,
            canRedo: future.length > 0,
            view,
            viewOnly: !!existingEdition
        }}>
            {children}
        </EditionContext.Provider>
    );
}
