import React, { createContext, useContext } from 'react';
import { MEINote } from '../lib/mei';

type PairData = {
    note?: MEINote;
    midiEvents: any[]; // PianoRollEvent
};

type PairDataFunction = (meiId: string) => PairData;

export const PairDataContext = createContext<PairDataFunction | undefined>(undefined);

export const usePair = (meiId: string) => {
    const getPairData = useContext(PairDataContext);
    if (!getPairData) {
        throw new Error('usePair must be used within a PairDataProvider');
    }
    return getPairData(meiId);
};
