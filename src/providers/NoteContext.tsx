import { Thing } from '@inrupt/solid-client';
import { createContext, useContext } from 'react';

interface NoteContextProps {
  pixelsPerTick: number;
  noteHeight: number;

  selectedEvent?: Thing
  onSelect: (event: Thing) => void

  onChange?: (e13: Thing) => void
  e13s?: Thing[]
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

export const NoteProvider: React.FC<NoteProviderProps> = ({ children, pixelsPerTick, noteHeight, selectedEvent, onSelect, e13s, onChange }) => (
  <NoteContext.Provider value={{ pixelsPerTick, noteHeight, selectedEvent, onSelect, e13s, onChange }}>
    {children}
  </NoteContext.Provider>
);
