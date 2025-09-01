import { createContext, Dispatch, PropsWithChildren, SetStateAction, useContext, useState } from "react";
import { UserSelection } from "../components/roll-desk/RollDesk";

interface SelectionContextProps {
    setSelection: Dispatch<SetStateAction<UserSelection[]>>;
    selection: UserSelection[];
}

export const SelectionContext = createContext<SelectionContextProps>({
    // noop that satisfies Dispatch<SetStateAction<...>>
    setSelection: (() => { }) as Dispatch<SetStateAction<UserSelection[]>>,
    selection: [],
});
/*
const SelectionProvider = ({ children }: PropsWithChildren) => {
    const [selection, setSelection] = useState<UserSelection[]>([]);

    return (
        <SelectionContext.Provider value={{ selection, setSelection }}>
            {children}
        </SelectionContext.Provider>
    );
}*/

// Overload 1: no filter → full array type
export function useSelection(): {
    selection: UserSelection[];
    setSelection: Dispatch<SetStateAction<UserSelection[]>>;
};

// Overload 2: type-guard filter → narrowed array type
export function useSelection<T extends UserSelection>(
    filter: (item: UserSelection) => item is T
): {
    selection: T[];
    setSelection: Dispatch<SetStateAction<UserSelection[]>>;
};

// Implementation
export function useSelection<T extends UserSelection>(
    filter?: (item: UserSelection) => item is T
) {
    const { selection, setSelection } = useContext(SelectionContext);
    const narrowed = filter ? selection.filter(filter) : selection;
    // types are handled by overloads
    return { selection: narrowed as T[] & UserSelection[], setSelection };
}
