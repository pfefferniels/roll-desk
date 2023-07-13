import { useState } from 'react';
import { DatasetProvider } from '../DatasetProvider';
import { Piece } from './Piece';
import { CircularProgress, Slider, Button, IconButton } from '@mui/material';
import { Thing, asUrl, getSourceUrl } from '@inrupt/solid-client';
import { Details } from './Details';
import { useDataset, useThing } from '@inrupt/solid-ui-react';
import { InfoOutlined, LinkOutlined } from '@mui/icons-material';

interface MidiViewerProps {
  url: string
  onChange?: (e13: Thing) => void
  onSelect?: (note: Thing) => void
}

const MidiViewer = ({ url, onChange, onSelect }: MidiViewerProps) => {
  const { dataset } = useDataset(url)
  const { thing: piece, error } = useThing(url, url)

  const [selectedNote, setSelectedNote] = useState<Thing>()
  const [pixelsPerTick, setPixelsPerTick] = useState(0.3);

  const handlePixelsPerTickChange = (event: any, newValue: number | number[]) => {
    setPixelsPerTick(newValue as number);
  };

  if (!piece || !dataset) {
    if (error) return <span>Failed fetching piece</span>
    else return <CircularProgress />
  }

  return (
    <DatasetProvider dataset={dataset} thing={piece}>
      <div style={{ marginLeft: '1rem' }}>
        <h4 style={{ margin: 0 }}>
          Roll Editor
          <IconButton onClick={() => window.open(asUrl(piece))}>
            <LinkOutlined />
          </IconButton>
        </h4>
      </div>

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

      <Piece
        piece={piece}
        dataset={dataset}
        pixelsPerTick={pixelsPerTick}
        onSelect={(note: Thing) => {
          setSelectedNote(note)
          onSelect && onSelect(note)
        }}
        onChange={(e13) => onChange && onChange(e13)} />

      {selectedNote && <Details onChange={(e13) => onChange && onChange(e13)} thing={selectedNote!} />}
    </DatasetProvider>
  );
};

export default MidiViewer;