import { useState } from "react";
import { MidiNote } from "../../lib/Performance";
import { MidiLikeGrid } from "../score/Grid";
import { System } from "../score/System";
import { GridDimensions } from "./GridDimensions";

interface MidiGridProps {
  notes: MidiNote[]
  activeNote?: MidiNote
  setActiveNote?: (note: MidiNote) => void
}

export const MIDIGrid: React.FC<MidiGridProps> = ({ notes, activeNote, setActiveNote }) => {
  const [dimensions, setDimensions] = useState<GridDimensions>({
    shift: 60,
    stretch: 60,
    staffSize: 7,
    areaHeight: 280
  })

  const maxWidth = (Math.max(...notes.map(n => n.onsetTime + n.duration)) + 2) * dimensions.stretch + dimensions.shift

  const fillMidiStaff = (getVerticalPosition: (pitch: number) => number) =>
    notes.map(n =>
      <rect
        key={`note_${n.id}`}
        id={`midiNote_${n.id}`}
        className={`midiNote ${/*p.motivation === Motivation.Addition && 'missingNote'*/''} ${(n === activeNote) && 'active'}`}
        x={n.onsetTime * dimensions.stretch + dimensions.shift}
        y={getVerticalPosition(n.pitch) + 400}
        width={n.duration * dimensions.stretch}
        height={5}
        onClick={() => setActiveNote && setActiveNote(n)} />
    )

  return (
    <System spacing={7} staffSize={dimensions.staffSize}>
      <MidiLikeGrid pitchHeight={dimensions.staffSize} width={maxWidth}>
        {(getVerticalPosition) => fillMidiStaff(getVerticalPosition)}
      </MidiLikeGrid>
    </System>
  )
}

/*
*/
