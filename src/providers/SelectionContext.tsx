import { createContext, Dispatch, SetStateAction, useContext } from 'react';
import { UserSelection } from '../components/roll-desk/RollDesk';

interface SelectionContextProps {
    setSelection: Dispatch<SetStateAction<UserSelection[]>>
    selection: UserSelection[]
}

export const SelectionContext = createContext<SelectionContextProps>({
    setSelection: () => {},
    selection: []
});

export const useSelection = () => useContext(SelectionContext)
