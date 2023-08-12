import { createContext, useContext } from 'react';
import { Mei } from '../lib/mei';

export const MeiContext = createContext<Mei | undefined>(undefined);

export const useMEI = () => useContext(MeiContext)
