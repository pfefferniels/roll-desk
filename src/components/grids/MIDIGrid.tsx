import { useContext, useState } from "react";
import { playNote } from "../../lib/midi-player";
import { MidiNote, RawPerformance } from "../../lib/midi/RawPerformance";
import { MidiOutputContext } from "../../providers";
import { MidiLikeGrid } from "../score/Grid";
import { System } from "../score/System";
import { GridDimensions } from "./GridDimensions";

interface MidiGridProps {
  performance: RawPerformance
  activeNote?: MidiNote
  setActiveNote?: (note: MidiNote) => void
}

export const MIDIGrid: React.FC<MidiGridProps> = ({ performance, activeNote, setActiveNote }) => {
  const { postSynthMessage } = useContext(MidiOutputContext)

  const notes = performance.asNotes()
  console.log('visualizing MIDI', notes)

  const [dimensions, setDimensions] = useState<GridDimensions>({
    shift: 60,
    stretch: 60,
    staffSize: 7,
    areaHeight: 280
  })

  const maxWidth = (Math.max(...notes.map(n => n.onsetTime + n.duration)) + 2) * dimensions.stretch + dimensions.shift

  return (
    <System spacing={7} staffSize={dimensions.staffSize}>
      <MidiLikeGrid pitchHeight={dimensions.staffSize} width={maxWidth}>
        {(getVerticalPosition) => 
            notes.map(n =>
              <rect
                key={`${performance.id}_${n.id}`}
                id={`${performance.id}_${n.id}`}
                className={`midiNote ${/*p.motivation === Motivation.Addition && 'missingNote'*/''} ${(n === activeNote) ? 'active' : 'not-active'}`}
                x={n.onsetTime * dimensions.stretch + dimensions.shift}
                y={getVerticalPosition(n.pitch) + 400}
                width={n.duration * dimensions.stretch}
                height={5}
                onClick={() => {
                  postSynthMessage && playNote(n.pitch, postSynthMessage)
                  setActiveNote && setActiveNote(n)
                }} />)
        }
      </MidiLikeGrid>
    </System>
  )
}

