import { createContext, Dispatch, SetStateAction, useCallback, useContext } from "react";
import { Millimeters } from "linked-rolls";
import { UserSelection } from "../components/roll-desk/RollDesk";

/** A stretch of the roll, from its start. */
export type RollRange = [Millimeters, Millimeters]

interface SelectionContextProps<T extends UserSelection = UserSelection> {
    selection: T[];
    setSelection: Dispatch<SetStateAction<T[]>>;

    range?: RollRange;
    setRange: Dispatch<SetStateAction<RollRange | undefined>>;
}

export const SelectionContext = createContext<SelectionContextProps>({
    selection: [],
    setSelection: (() => { }),
    range: undefined,
    setRange: (() => { })
});

/**
 * The selection, narrowed to the kind a view deals in.
 *
 * The setter is narrowed with it, and what it writes is put back into the
 * whole selection: an updater is handed only the items of its own kind and
 * what it returns replaces those, so a view cannot silently drop the
 * selections it was never shown.
 */
export function useSelection<T extends UserSelection = UserSelection>(
    filter?: (item: UserSelection) => item is T
): SelectionContextProps<T> {
    const { selection, setSelection, range, setRange } = useContext(SelectionContext);

    // Without a filter there is nothing for T to be inferred from, so it
    // is the whole selection and the assertion holds.
    const narrow = useCallback(
        (items: readonly UserSelection[]) => (filter ? items.filter(filter) : items as T[]),
        [filter]
    );

    const setNarrowed = useCallback<Dispatch<SetStateAction<T[]>>>(update => {
        setSelection(whole => {
            const mine = narrow(whole);
            const replaced = typeof update === 'function' ? update(mine) : update;
            const others = whole.filter(item => !mine.includes(item as T));
            return [...others, ...replaced];
        });
    }, [setSelection, narrow]);

    return {
        selection: narrow(selection),
        setSelection: setNarrowed,
        range,
        setRange
    };
}
