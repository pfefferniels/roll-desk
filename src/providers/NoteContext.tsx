import { createContext, useContext } from 'react';

interface NoteContextProps {
  pixelsPerTick: number;
  noteHeight: number;
}

export const NoteContext = createContext<NoteContextProps | undefined>(undefined);

export const useNoteContext = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNoteContext must be used within a NoteProvider');
  }
  return context;
};

interface NoteProviderProps {
  children: React.ReactNode;
  pixelsPerTick: number;
  noteHeight: number;
}

export const NoteProvider: React.FC<NoteProviderProps> = ({ children, pixelsPerTick, noteHeight }) => (
  <NoteContext.Provider value={{ pixelsPerTick, noteHeight }}>
    {children}
  </NoteContext.Provider>
);
