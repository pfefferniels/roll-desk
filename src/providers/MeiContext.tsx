import { createContext, useContext } from 'react';
import { MEI } from '../lib/mei';

interface MEIContextProps {
    mei?: MEI 
    updateMEI: (newMEI: MEI) => void
}

export const MEIContext = createContext<MEIContextProps>({ mei: undefined, updateMEI: () => {}});

export const useMEI = () => useContext(MEIContext)
