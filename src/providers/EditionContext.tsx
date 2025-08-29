import { Toolbar, List } from "@mui/material";
import { enablePatches, produceWithPatches, applyPatches, Patch, Draft } from "immer";
import { assign, Edit, Edition, EditionMetadata } from "linked-rolls";
import { createContext, useEffect, useMemo, useState } from "react";

type EditionOp = (d: Draft<Edition>) => void;

type HistoryEntry = { patches: Patch[]; inverse: Patch[] };
type History = { past: HistoryEntry[]; future: HistoryEntry[]; limit: number };

export const emptyMetadata: EditionMetadata = {
    title: '',
    license: '',
    base: '',
    creation: {
        publisher: { name: '', sameAs: [] },
        publicationDate: new Date(),
        collationTolerance: {
            toleranceEnd: 5,
            toleranceStart: 5,
        }
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
            date: assign('dateAssignment', new Date()),
            place: { name: '', sameAs: [] }
        }
    }
};

export const EditionContext = createContext<{
    edition: Edition;
    setEdition: (edition: Edition) => void;
    apply: (op: EditionOp) => void
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}>({
    edition: {
        copies: [],
        versions: [],
        ...emptyMetadata
    },
    setEdition: () => {},
    apply: () => { },
    undo: () => { },
    redo: () => { },
    canUndo: false,
    canRedo: false
});

export function EditionProvider({ children }: { children: React.ReactNode }) {
    const [edition, setEdition] = useState<Edition>({ versions: [], copies: [], ...emptyMetadata });
    const [history, setHistory] = useState<History>({
        past: [],
        future: [],
        limit: 300,
    });

    useEffect(() => {
        enablePatches();
    }, []);

    const apply = (op: EditionOp) => {
        setEdition((prev) => {
            const [next, patches, inverse] = produceWithPatches(prev, op);
            setHistory((h) => {
                const nextPast = [...h.past, { patches, inverse }];
                // respect limit (drop oldest if needed)
                const clipped =
                    nextPast.length > h.limit
                        ? nextPast.slice(nextPast.length - h.limit)
                        : nextPast;
                return { past: clipped, future: [], limit: h.limit };
            });
            return next;
        });
    };

    const undo = () => {
        setEdition((current) => {
            if (history.past.length === 0) return current;
            const entry = history.past[history.past.length - 1];
            const undone = applyPatches(current, entry.inverse);
            setHistory((h) => ({
                past: h.past.slice(0, -1),
                future: [...h.future, entry],
                limit: h.limit,
            }));
            return undone;
        });
    };

    const redo = () => {
        setEdition((current) => {
            if (history.future.length === 0) return current;
            const entry = history.future[history.future.length - 1];
            const redone = applyPatches(current, entry.patches);
            setHistory((h) => ({
                past: [...h.past, entry],
                future: h.future.slice(0, -1),
                limit: h.limit,
            }));
            return redone;
        });
    };

    const { canUndo, canRedo } = useMemo(
        () => ({
            canUndo: history.past.length > 0,
            canRedo: history.future.length > 0,
        }),
        [history.past.length, history.future.length]
    );

    return (
        <EditionContext.Provider value={{ edition, setEdition, apply, undo, redo, canUndo, canRedo }}>
            {children}
        </EditionContext.Provider>
    );
}
