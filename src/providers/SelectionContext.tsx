import { createContext, Dispatch, SetStateAction, useContext } from "react";
import { UserSelection } from "../components/roll-desk/RollDesk";

interface SelectionContextProps<T extends UserSelection = UserSelection> {
    selection: T[];
    setSelection: Dispatch<SetStateAction<T[]>>;

    range?: [number, number];
    setRange: Dispatch<SetStateAction<[number, number] | undefined>>;
}

export const SelectionContext = createContext<SelectionContextProps>({
    selection: [],
    setSelection: (() => { }) as Dispatch<SetStateAction<UserSelection[]>>,
    range: undefined,
    setRange: (() => { }) as Dispatch<SetStateAction<[number, number] | undefined>>
});

export function useSelection<T extends UserSelection = UserSelection>(
    filter?: (item: UserSelection) => item is T
): SelectionContextProps<T> {
    const { selection, setSelection, range, setRange } = useContext(SelectionContext);
    const narrowed = filter ? selection.filter(filter) : selection;

    return {
        selection: narrowed as T[],
        setSelection: setSelection as Dispatch<SetStateAction<T[]>>,
        range,
        setRange
    };
}
