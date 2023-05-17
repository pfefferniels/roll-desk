import { Thing } from '@inrupt/solid-client';
import { createContext, useContext } from 'react';

interface NoteContextProps {
  pixelsPerTick: number;
  noteHeight: number;
  currentSelection?: Thing
  setCurrentSelection: (newSelection: Thing) => void
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
  currentSelection?: Thing
  setCurrentSelection: (newSelection: Thing) => void
}

export const NoteProvider: React.FC<NoteProviderProps> = ({ children, pixelsPerTick, noteHeight, currentSelection, setCurrentSelection }) => (
  <NoteContext.Provider value={{ pixelsPerTick, noteHeight, currentSelection, setCurrentSelection }}>
    {children}
  </NoteContext.Provider>
);
