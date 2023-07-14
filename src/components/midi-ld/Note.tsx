import { Thing, asUrl, getInteger, getUrl } from '@inrupt/solid-client';
import { crm, midi } from '../../helpers/namespaces';
import { Boundary } from './Boundary';
import { useNoteContext } from '../../providers/NoteContext';

interface NoteProps {
  note: Thing;
  color: string;
}

export const Note = ({ note, color }: NoteProps) => {
  const { pixelsPerTick, noteHeight, onSelect, onChange, e13s } = useNoteContext()

  const beginOfBegin = getInteger(note, crm('P82a_begin_of_the_begin')) || 0
  const endOfBegin = getInteger(note, crm('P81a_end_of_the_begin')) || 0

  const beginOfEnd = getInteger(note, crm('P81b_begin_of_the_end')) || 0
  const endOfEnd = getInteger(note, crm('P82b_end_of_the_end')) || 0

  const pitch = getInteger(note, midi('pitch')) || 0

  const handleClick = () => {
    onSelect(note)
  };

  const boundaryAttrs = [
    crm('P82a_begin_of_the_begin'),
    crm('P81a_end_of_the_begin'),
    crm('P81b_begin_of_the_end'),
    crm('P82b_end_of_the_end')
  ]
  const boundaryE13s = e13s?.filter(e13 =>
    getUrl(e13, crm('P140_assigned_attribute_to')) === asUrl(note)
    && boundaryAttrs.includes(getUrl(e13, crm('P177_assigned_property_of_type')) || ''))

  return (
    <>
      <rect // The note
        x={(beginOfBegin + endOfBegin) / 2 * pixelsPerTick}
        y={(128 - pitch) * noteHeight}
        width={((beginOfEnd + endOfEnd) / 2 - endOfBegin) * pixelsPerTick}
        height={noteHeight}
        fill={color}
        fillOpacity={0.5}
        onClick={handleClick}
      />

      {boundaryE13s?.map(e13 => (
        <Boundary
          key={`boundary_${asUrl(e13)}`}
          e13={e13}
          pitch={pitch}
          onChange={(updatedE13) => onChange && onChange(updatedE13)} />
      ))}
    </>
  );
};
