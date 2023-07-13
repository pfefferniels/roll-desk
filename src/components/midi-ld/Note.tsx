import { Thing, buildThing, createThing, getInteger, thingAsMarkdown } from '@inrupt/solid-client';
import { crm, midi } from '../../helpers/namespaces';
import { Boundary } from './Boundary';
import { useNoteContext } from '../../providers/NoteContext';
import { DCTERMS, RDF } from '@inrupt/vocab-common-rdf';
import { useSession } from '@inrupt/solid-ui-react';

interface NoteProps {
  note: Thing;
  color: string;
}

export const Note = ({ note, color }: NoteProps) => {
  const { session } = useSession()
  const { pixelsPerTick, noteHeight, onSelect, onChange } = useNoteContext()

  const beginOfBegin = getInteger(note, crm('P82a_begin_of_the_begin')) || 0
  const endOfBegin = getInteger(note, crm('P81a_end_of_the_begin')) || 0

  const beginOfEnd = getInteger(note, crm('P81b_begin_of_the_end')) || 0
  const endOfEnd = getInteger(note, crm('P82b_end_of_the_end')) || 0

  const pitch = getInteger(note, midi('pitch')) || 0

  const handleClick = () => {
    onSelect(note)
  };

  const onChangeProperty = (property: string, newValue: number) => {
    if (!onChange) return

    const e13 = buildThing(createThing())
      .addUrl(RDF.type, crm('E13_Attribute_Assignment'))
      .addUrl(crm('P140_assigned_attribute_to'), note)
      .addInteger(crm('P141_assigned'), newValue)
      .addUrl(crm('P177_assigned_property_of_type'), property)
      .addDate(DCTERMS.created, new Date(Date.now()))
      .addUrl(crm('P14_carried_out'), session.info.webId || 'unknown')
      .build()
    onChange(e13)
  }

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

      <Boundary
        begin={beginOfBegin}
        end={endOfBegin}
        pitch={pitch}
        onChangeBegin={n => onChangeProperty(crm('P82a_begin_of_the_begin'), n)}
        onChangeEnd={n => onChangeProperty(crm('P81a_end_of_the_begin'), n)}/>

      <Boundary
        begin={beginOfEnd}
        end={endOfEnd}
        pitch={pitch}
        onChangeBegin={n => onChangeProperty(crm('P81b_begin_of_the_end'), n)}
        onChangeEnd={n => onChangeProperty(crm('P82b_end_of_the_end'), n)} />
    </>
  );
};
