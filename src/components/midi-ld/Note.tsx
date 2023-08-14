import { Thing, asUrl, getInteger, getThing, getUrl } from '@inrupt/solid-client';
import { crm, mer, midi } from '../../helpers/namespaces';
import { Boundary } from './Boundary';
import { useNoteContext } from '../../providers/NoteContext';
import './Note.css'
import { urlAsLabel } from '../../helpers/urlAsLabel';
import { DatasetContext } from '@inrupt/solid-ui-react';
import { useContext } from 'react';
import { TickEvent } from './TickEvent';

interface NoteProps {
  note: Thing;
  color: string;
}

export const Note = ({ note, color }: NoteProps) => {
  const { pixelsPerTick, noteHeight, selectedEvent, onSelect } = useNoteContext()
  const { solidDataset: midiDataset } = useContext(DatasetContext)

  if (!midiDataset) return null

  const onsetUrl = getUrl(note, mer('has_onset'))
  const offsetUrl = getUrl(note, mer('has_offset'))
  if (!onsetUrl || !offsetUrl) return null

  const onsetThing = getThing(midiDataset, onsetUrl)
  const offsetThing = getThing(midiDataset, offsetUrl)

  if (!onsetThing || !offsetThing) {
    console.log('onset or offset event not found for note', asUrl(note))
    return null
  }

  const pitch = getInteger(onsetThing, midi('pitch')) || 0
  const tick = getInteger(onsetThing, midi('absoluteTick')) || 0
  const duration = (getInteger(offsetThing, midi('absoluteTick')) || 0) - tick

  return (
    <>
      <rect
        className='note'
        data-id={urlAsLabel(asUrl(note))}
        x={tick * pixelsPerTick}
        y={(128 - pitch) * noteHeight}
        width={duration * pixelsPerTick}
        height={noteHeight}
        fill={color}
        fillOpacity={note === selectedEvent ? 1 : 0.5}
        onClick={() => onSelect(note)}
      />

      <TickEvent event={onsetThing} />
      <TickEvent event={offsetThing} />
    </>
  );
};
