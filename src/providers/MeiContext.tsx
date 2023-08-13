import { createContext, useContext } from 'react';
import { MEI } from '../lib/mei';

export const MEIContext = createContext<MEI | undefined>(undefined);

export const useMEI = () => useContext(MEIContext)
