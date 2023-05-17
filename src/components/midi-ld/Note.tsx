import React, { useContext, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Thing, getInteger, thingAsMarkdown } from '@inrupt/solid-client';
import { crm, midi } from '../../helpers/namespaces';
import { DatasetContext, Table, TableColumn } from '@inrupt/solid-ui-react';
import { Boundary } from './Boundary';
import { useNoteContext } from '../../providers/NoteContext';

interface NoteProps {
  note: Thing;
  color: string;
}

export const Note = ({ note, color }: NoteProps) => {
  const { solidDataset } = useContext(DatasetContext)
  const { pixelsPerTick, noteHeight } = useNoteContext()

  const [dialogOpen, setDialogOpen] = useState(false);

  const beginOfBegin = getInteger(note, crm('P82a_begin_of_the_begin')) || 0
  const endOfBegin = getInteger(note, crm('P81a_end_of_the_begin')) || 0

  const beginOfEnd = getInteger(note, crm('P81b_begin_of_the_end')) || 0
  const endOfEnd = getInteger(note, crm('P82b_end_of_the_end')) || 0

  const pitch = getInteger(note, midi('pitch')) || 0

  const handleClick = () => {
    setDialogOpen(!dialogOpen);
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

      <foreignObject>
        <Dialog open={dialogOpen} onClose={handleClick}>
          <DialogTitle>Note Information</DialogTitle>
          <DialogContent>
            <Table things={[{ dataset: solidDataset!, thing: note }]}>
              <TableColumn property={midi('pitch')} header='Pitch' />
            </Table>
          </DialogContent>
        </Dialog>
      </foreignObject>
    </>
  );
};
