import { createContext, Dispatch, SetStateAction, useContext } from "react";
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
    setSelection: (() => { }) as Dispatch<SetStateAction<UserSelection[]>>,
    range: undefined,
    setRange: (() => { }) as Dispatch<SetStateAction<RollRange | undefined>>
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
