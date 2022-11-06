import { pitchToSitch } from "alignmenttool";
import { useCallback, useContext, useState } from "react";
import { playNote } from "../../lib/midi-player";
import { MidiNote, RawPerformance } from "../../lib/midi/RawPerformance";
import { MidiOutputContext } from "../../providers";
import { MidiLikeGrid } from "../score/Grid";
import { System } from "../score/System";
import { GridDimensions } from "./GridDimensions";

interface MidiGridProps {
  performance: RawPerformance
  secondaryPerformance?: RawPerformance
  activeNote?: MidiNote
  setActiveNote?: (note: MidiNote) => void
}

export const MIDIGrid: React.FC<MidiGridProps> = ({ performance, secondaryPerformance, activeNote, setActiveNote }) => {
  const { postSynthMessage } = useContext(MidiOutputContext)

  const [dimensions, setDimensions] = useState<GridDimensions>({
    shift: 60,
    stretch: 100,
    staffSize: 5,
    areaHeight: 280
  })
  const [showDetailsForNote, setShowDetailsForNote] = useState(-1)

  const notes = performance.asNotes()
  const secondaryNotes = secondaryPerformance?.asNotes()
  const maxWidth = (Math.max(...notes.map(n => n.onsetTime + n.duration)) + 2) * dimensions.stretch + dimensions.shift

  const fillGrid = useCallback((getVerticalPosition: any) => {
    return (
      notes.map(n =>
        <g>
          {n.id === showDetailsForNote &&
            <text x={n.onsetTime * dimensions.stretch + dimensions.shift}
              y={getVerticalPosition(n.pitch)}
              className='labelText'>
              {pitchToSitch(n.pitch)} ({n.velocity})
            </text>
          }
          <rect
            key={`${performance.id}_${n.id}`}
            id={`${performance.id}_${n.id}`}
            className={`midiNote ${/*p.motivation === Motivation.Addition && 'missingNote'*/''} ${(n === activeNote) ? 'active' : 'not-active'}`}
            x={n.onsetTime * dimensions.stretch + dimensions.shift}
            y={getVerticalPosition(n.pitch)}
            rx={1}
            ry={1}
            width={n.duration * dimensions.stretch}
            height={dimensions.staffSize}
            onClick={() => {
              postSynthMessage && playNote(n.pitch, n.velocity, postSynthMessage)
              setActiveNote && setActiveNote(n)
            }}
            onMouseOver={() => setShowDetailsForNote(n.id)}
            onMouseLeave={() => setShowDetailsForNote(-1)}
          />
        </g>)
    )
  }, [notes])

  const fillSecondaryGrid = useCallback((getVerticalPosition: any) => {
    if (!secondaryNotes) return null
    const firstOnset = secondaryNotes[0].onsetTime

    return (
      secondaryNotes.map(n =>
        <g>
          <rect
            key={`${performance.id}_${n.id}`}
            id={`${performance.id}_${n.id}`}
            className='secondaryMidiNote'
            x={(n.onsetTime - firstOnset) * dimensions.stretch + dimensions.shift}
            y={getVerticalPosition(n.pitch)}
            rx={1}
            ry={1}
            width={n.duration * dimensions.stretch}
            height={dimensions.staffSize}
          />
        </g>)
    )
  }, [secondaryNotes])


  return (
    <System spacing={7} staffSize={dimensions.staffSize}>
      <MidiLikeGrid pitchHeight={dimensions.staffSize} width={maxWidth}>
        {fillGrid}
        {fillSecondaryGrid}
      </MidiLikeGrid>
    </System>
  )
}

