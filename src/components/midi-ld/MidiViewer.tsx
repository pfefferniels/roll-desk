import { useState } from 'react';
import { DatasetProvider } from '../DatasetProvider';
import { Piece } from './Piece';
import { CircularProgress, Slider, Button } from '@mui/material';
import { Thing, getSourceUrl } from '@inrupt/solid-client';
import { Details } from './Details';
import { useDataset, useThing } from '@inrupt/solid-ui-react';

interface MidiViewerProps {
  url: string
  onChange?: (newAttributes: Thing[]) => {}
}

const MidiViewer = ({ url, onChange }: MidiViewerProps) => {
  const { dataset } = useDataset(url)
  const { thing: piece, error } = useThing(url, url)

  const [selectedNote, onSelect] = useState<Thing>()
  const [pixelsPerTick, setPixelsPerTick] = useState(0.3);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handlePixelsPerTickChange = (event: any, newValue: number | number[]) => {
    setPixelsPerTick(newValue as number);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (!piece || !dataset) {
    if (error) return <span>Failed fetching piece</span>
    else return <CircularProgress />
  }

  return (
    <DatasetProvider dataset={dataset} thing={piece}>
      <div style={{ marginLeft: '1rem' }}>
        <b>Viewing MIDI file</b>
        (<code>{getSourceUrl(dataset)}</code>)
      </div>

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

      <Piece
        piece={piece}
        dataset={dataset}
        pixelsPerTick={pixelsPerTick}
        onSelect={onSelect}
        onChange={(e13s) => onChange && onChange(e13s)} />

      selectedNote && <Details thing={selectedNote!} />
    </DatasetProvider>
  );
};

export default MidiViewer;