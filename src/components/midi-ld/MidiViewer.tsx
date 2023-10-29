import { useEffect, useState } from 'react';
import { DatasetProvider } from '../DatasetProvider';
import { Piece } from './Piece';
import { CircularProgress, IconButton } from '@mui/material';
import { Thing, asUrl, getUrl } from '@inrupt/solid-client';
import { Details } from './Details';
import { useDataset, useThing } from '@inrupt/solid-ui-react';
import { LinkOutlined } from '@mui/icons-material';
import { crm } from '../../helpers/namespaces';
import { asPianoRoll } from '../../lib/midi/asPianoRoll';
import { PianoRoll } from 'alignmenttool';

interface MidiViewerProps {
  url: string
  onChange?: (e13: Thing) => void
  onSelect?: (event: Thing | null) => void
  onDone?: (pr: PianoRoll) => void
  e13s?: Thing[]
  asSvg?: boolean
}

const MidiViewer = ({ url, onChange, onSelect, onDone, e13s, asSvg }: MidiViewerProps) => {
  const { dataset } = useDataset(url)
  const { thing: piece, error } = useThing(url, url)

  const [selectedNote, setSelectedNote] = useState<Thing>()
  const [pixelsPerTick, _] = useState(0.3);

  useEffect(() => {
    if (!piece || !dataset) return

    if (onDone) {
      const pianoRoll = asPianoRoll(piece, dataset, 0.001)
      pianoRoll && onDone(pianoRoll)
    }
  }, [piece, dataset, onDone])

  useEffect(() => {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setSelectedNote(undefined)
        onSelect && onSelect(null)
      }
    })
  })

  if (!piece || !dataset) {
    if (error) return <span>Failed fetching piece</span>
    else return <CircularProgress />
  }

  if (asSvg) {
    return (
      <DatasetProvider dataset={dataset} thing={piece}>
        <Piece
          piece={piece}
          dataset={dataset}
          pixelsPerTick={pixelsPerTick}
          selectedEvent={selectedNote}
          onSelect={(note: Thing) => {
            setSelectedNote(note)
            onSelect && onSelect(note)
          }}
          e13s={e13s}
          onChange={(e13) => onChange && onChange(e13)} />
      </DatasetProvider>
    )
  }

  return (
    <DatasetProvider dataset={dataset} thing={piece}>
      <div style={{ marginLeft: '1rem' }}>
        <h4 style={{ margin: 0 }}>
          Roll Viewer
          <IconButton onClick={() => window.open(asUrl(piece))}>
            <LinkOutlined />
          </IconButton>
        </h4>
      </div>

      <Piece
        piece={piece}
        dataset={dataset}
        pixelsPerTick={pixelsPerTick}
        selectedEvent={selectedNote}
        onSelect={(note: Thing) => {
          setSelectedNote(note)
          onSelect && onSelect(note)
        }}
        e13s={e13s}
        onChange={(e13) => onChange && onChange(e13)} />

      {selectedNote && (
        <Details
          e13s={e13s?.filter(e13 => getUrl(e13, crm('P140_assigned_attribute_to')) === asUrl(selectedNote))}
          onChange={(e13) => onChange && onChange(e13)}
          thing={selectedNote!} />
      )}
    </DatasetProvider>
  );
};

export default MidiViewer;