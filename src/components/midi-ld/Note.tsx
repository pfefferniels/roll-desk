import { Thing, asUrl, getInteger, getThing, getUrl } from '@inrupt/solid-client';
import { mer, midi } from '../../helpers/namespaces';
import { useNoteContext } from '../../providers/NoteContext';
import { urlAsLabel } from '../../helpers/urlAsLabel';
import { DatasetContext } from '@inrupt/solid-ui-react';
import { useContext } from 'react';
import { NoteOnOff } from './NoteOnOff';
import './Note.css'

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
      <line
        className='note'
        data-id={urlAsLabel(asUrl(note))}
        x1={tick * pixelsPerTick + noteHeight/2}
        y1={(128 - pitch + 0.5) * noteHeight}
        x2={(tick + duration) * pixelsPerTick - noteHeight/2}
        y2={(128 - pitch + 0.5) * noteHeight}
        stroke={color}
        strokeWidth={noteHeight}
        strokeLinecap='round'
        fill={color}
        fillOpacity={note === selectedEvent ? 1 : 0.5}
        onClick={() => onSelect(note)}
      />

      <NoteOnOff event={onsetThing} />
      <NoteOnOff event={offsetThing} />
    </>
  );
};
