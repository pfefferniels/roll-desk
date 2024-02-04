import React, { createContext, useContext, useEffect, useState } from 'react';
import { Piano } from "../lib/midi-player/tonejs-piano"
import { MIDIEvent } from 'linked-rolls/lib/Emulation';
import { NoteOffEvent, NoteOnEvent } from 'linked-rolls/lib/.ldo/rollo.typings';
import * as Tone from 'tone'

interface PianoContextProps {
  piano: Piano;
}

const PianoContext = createContext<PianoContextProps | undefined>(undefined);

export const PianoContextProvider: React.FC = ({ children }) => {
  const [piano] = useState(() => {
    const initializedPiano = new Piano({
      velocities: 5,
    });

    initializedPiano.toDestination();

    (async () => {
      await initializedPiano.load();
    })();

    return initializedPiano;
  });

  useEffect(() => {
    return () => {
      // Clean up piano resources when the component unmounts
    };
  }, [piano]);

  return (
    <PianoContext.Provider value={{ piano }}>
      {children}
    </PianoContext.Provider>
  );
};

export const usePianoInstance = () => {
  const context = useContext(PianoContext);
  if (!context) {
    throw new Error('usePiano must be used within a PianoContextProvider');
  }
  return context.piano;
};

// Your MIDI event handling functions
export const usePiano = () => {
  const piano = usePianoInstance();

  const play = (events: MIDIEvent[]) => {
    console.log('playing', events)
    for (const event of events) {
      if (event.type?.["@id"] === 'NoteOnEvent') {
        const noteOn = event as NoteOnEvent;
        piano.keyDown({
          note: Tone.Midi(noteOn.pitch, 'midi').toNote(),
          velocity: 1 / noteOn.velocity,
          time: event.at,
          midi: noteOn.pitch,
        });
      } else if (event.type?.["@id"] === 'NoteOffEvent') {
        const noteOff = event as NoteOffEvent;
        piano.keyUp({
          note: Tone.Midi(noteOff.pitch, 'midi').toNote(),
          time: event.at,
          midi: noteOff.pitch,
        });
      } else if (event.type?.["@id"] === 'SustainPedalOnEvent') {
        piano.pedalDown({ time: event.at });
      } else if (event.type?.["@id"] === 'SustainPedalOffEvent') {
        piano.pedalUp({ time: event.at });
      }
    }
  };

  const stopAll = () => {
    piano.stopAll()
  }

  const playSingleNote = (note: { hasPitch: number }) => {
    piano.keyDown({
      note: Tone.Midi(note.hasPitch, 'midi').toNote(),
      midi: note.hasPitch,
    });

    piano.keyUp({
      note: Tone.Midi(note.hasPitch, 'midi').toNote(),
      midi: note.hasPitch,
      time: 300
    });
  };

  return { play, playSingleNote, stopAll };
};
