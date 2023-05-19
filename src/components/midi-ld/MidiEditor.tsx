import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DatasetProvider } from '../DatasetProvider';
import { Piece } from './Piece';
import { NoteProvider } from '../../providers/NoteContext';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import { Thing } from '@inrupt/solid-client';
import { Details } from './Details';

const MidiEditor: React.FC = () => {
  const { midiId, noteId } = useParams();

  const noteHeight = 8;

  const [selectedNote, setSelectedNote] = useState<Thing>()
  const [pixelsPerTick, setPixelsPerTick] = useState(0.01);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handlePixelsPerTickChange = (event: any, newValue: number | number[]) => {
    setPixelsPerTick(newValue as number);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (!midiId) return <div>no MIDI id provided</div>

  return (
    <DatasetProvider datasetName={`${midiId}.ttl`}>
      <h2>MIDI Editor</h2>
      <p>MIDI ID: {midiId}</p>
      {noteId && <p>highlighting note {noteId}</p>}

      <Button onClick={toggleDrawer}>Settings</Button>

      <div style={{ padding: '20px', width: '30vw' }}>
        <Slider
          value={pixelsPerTick}
          onChange={handlePixelsPerTickChange}
          min={0.1}
          max={1.5}
          step={0.1}
          valueLabelDisplay="auto"
        />
      </div>

      <NoteProvider
        pixelsPerTick={pixelsPerTick}
        noteHeight={noteHeight}
        selectedNote={selectedNote}
        setSelectedNote={setSelectedNote}>
        <Piece />
        <Details />
      </NoteProvider>
    </DatasetProvider>
  );
};

export default MidiEditor;