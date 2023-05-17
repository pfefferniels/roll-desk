import { Thing, getInteger } from '@inrupt/solid-client';
import { crm, midi } from '../../helpers/namespaces';
import { Boundary } from './Boundary';
import { useNoteContext } from '../../providers/NoteContext';

interface NoteProps {
  note: Thing;
  color: string;
}

export const Note = ({ note, color }: NoteProps) => {
  const { pixelsPerTick, noteHeight, setCurrentSelection } = useNoteContext()

  const beginOfBegin = getInteger(note, crm('P82a_begin_of_the_begin')) || 0
  const endOfBegin = getInteger(note, crm('P81a_end_of_the_begin')) || 0

  const beginOfEnd = getInteger(note, crm('P81b_begin_of_the_end')) || 0
  const endOfEnd = getInteger(note, crm('P82b_end_of_the_end')) || 0

  const pitch = getInteger(note, midi('pitch')) || 0

  const handleClick = () => {
    setCurrentSelection(note)
  };

  return (
    <>
      <rect // The note
        x={(beginOfBegin + endOfBegin) / 2 * pixelsPerTick}
        y={(128 - pitch) * noteHeight}
        width={((beginOfEnd + endOfEnd) / 2 - endOfBegin) * pixelsPerTick}
        height={noteHeight}
        fill={color}
        opacity={0.5}
        onClick={handleClick}
      />

      <Boundary begin={beginOfBegin} end={endOfBegin} pitch={pitch} pixelsPerTick={pixelsPerTick} noteHeight={noteHeight} />
      <Boundary begin={beginOfEnd} end={endOfEnd} pitch={pitch} pixelsPerTick={pixelsPerTick} noteHeight={noteHeight} />
    </>
  );
};
