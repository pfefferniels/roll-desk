import { pitchToSitch } from "alignmenttool";
import { useContext, useState } from "react";
import { playNote } from "../../lib/midi-player";
import { MidiNote, RawPerformance } from "../../lib/midi/RawPerformance";
import { MidiOutputContext } from "../../providers";

// scrolling/panning etc. will modify that data
class MIDIDimension {
  // from which tick to which tick
  private horizontal: [number, number] = [0, 1000]

  // from which pitch to witch pitch
  private vertical: [number, number] = [50, 100]

  totalWidth: number
  totalHeight: number

  constructor(totalWidth: number, totalHeight: number) {
    this.totalWidth = totalWidth
    this.totalHeight = totalHeight
  }

  get lowerPitch() { return this.vertical[0] }
  get higherPitch() { return this.vertical[1] }

  get firstOnset() { return this.horizontal[0] }
  get secondOnset() { return this.horizontal[1] }

  get onsetStretch() {
    return this.totalWidth / (this.secondOnset - this.firstOnset)
  }

  get pitchStretch() {
    return this.totalHeight / (this.higherPitch - this.lowerPitch)
  }

  onsetPosition(onset: number) {
    return (onset - this.firstOnset) * this.onsetStretch
  }

  pitchPosition(pitch: number) {
    return (pitch - this.lowerPitch) * this.pitchStretch
  }
}

interface MIDINotesProps {
  notes: MidiNote[]
  dimension: MIDIDimension
}

export const MIDINotes = ({ notes, dimension }: MIDINotesProps) => {
  const { postSynthMessage } = useContext(MidiOutputContext)

  const [hoveredNote, setHoveredNote] = useState<MidiNote>()
  const [selectedNote, setSelectedNote] = useState<MidiNote>()

  return (
    <g>
      {
        notes
          .filter(n => {
            // include only pitches which are not higher or lower than the current window
            return n.pitch <= dimension.higherPitch && n.pitch >= dimension.lowerPitch
          })
          .filter(n => {
            // include only notes which are not before or after the current window
            return n.onsetTime >= dimension.firstOnset && n.onsetTime <= dimension.secondOnset
          })
          .map(n => {
            return (
              <g>
                {n === hoveredNote &&
                  <text
                    x={dimension.onsetPosition(n.onsetTime)}
                    y={dimension.pitchPosition(n.pitch)}
                    className='labelText'>
                    {pitchToSitch(n.pitch)} ({n.velocity})
                  </text>
                }
                <rect
                  key={`${n.id}`}
                  id={`${n.id}`}
                  className={`midiNote ${n === selectedNote ? 'selected' : ''}`}
                  x={dimension.onsetPosition(n.onsetTime)}
                  y={dimension.pitchPosition(n.pitch)}
                  rx={1}
                  ry={1}
                  width={n.duration * dimension.onsetStretch}
                  height={dimension.pitchStretch}
                  onClick={() => {
                    postSynthMessage && playNote(n.pitch, n.velocity, postSynthMessage)
                    setSelectedNote(n)
                  }}
                  onMouseOver={() => setHoveredNote(n)}
                  onMouseLeave={() => setHoveredNote(undefined)}
                />
              </g>)
          })}
    </g>
  )
}

interface MIDIViewerProps {
  piece: RawPerformance
  width: number
  height: number
}

export const MIDIViewer = ({ piece, width, height }: MIDIViewerProps) => {
  return (
    <svg width={width} height={height}>
      <MIDINotes notes={piece.asNotes()} dimension={new MIDIDimension(width, height)} />
    </svg>
  )
}
