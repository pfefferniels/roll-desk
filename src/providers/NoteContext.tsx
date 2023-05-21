import { Thing } from '@inrupt/solid-client';
import { createContext, useContext } from 'react';

interface NoteContextProps {
  pixelsPerTick: number;
  noteHeight: number;

  selectedNote?: Thing
  setSelectedNote: (newSelection: Thing) => void

  onChange?: (newAttributes: Thing[]) => void
}

export const NoteContext = createContext<NoteContextProps | undefined>(undefined);

export const useNoteContext = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNoteContext must be used within a NoteProvider');
  }
  return context;
};

interface NoteProviderProps extends NoteContextProps {
  children: React.ReactNode;
}

export const NoteProvider: React.FC<NoteProviderProps> = ({ children, pixelsPerTick, noteHeight, selectedNote, setSelectedNote, onChange }) => (
  <NoteContext.Provider value={{ pixelsPerTick, noteHeight, selectedNote, setSelectedNote, onChange }}>
    {children}
  </NoteContext.Provider>
);
