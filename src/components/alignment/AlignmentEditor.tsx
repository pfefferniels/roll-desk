import { useContext, useState } from "react"
import GlobalContext from "../GlobalContext"
import { Motivation, SemanticAlignmentPair } from "../../lib/AlignedPerformance"
import { MidiNote } from "../../lib/Performance"
import { basePitchOfNote, ScoreNote } from "../../lib/Score"
import { EditMotivation } from "./EditMotivation"
import { NoteHead } from "../score/NoteHead"
import { Staff } from "../score/Staff"
import { System } from "../score/System"
import { SVGElementConnector } from "../SVGElementConnector"
import { AlignmentActions } from "./AlignmentActions"

export default function AlignmentEditor() {
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)

  const [horizontalStretch, setHorizontalStretch] = useState(60)
  const [horizontalShift, setHorizontalShift] = useState(20)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<ScoreNote>()
  const [activeMIDINote, setActiveMIDINote] = useState<MidiNote>()
  const [svgReady, setSvgReady] = useState(false)

  const verticalStretch = 2.9
  const staffSize = 7
  const areaHeight = 127 * verticalStretch

  const changeMotivation = (pair: SemanticAlignmentPair, target: Motivation) => {
    alignedPerformance.updateMotivation(pair, target)
    triggerUpdate()
  }

  const fillScoreStaff = (part: number) => {
    return (getVerticalPosition: any) => {
      return alignedPerformance.getSemanticPairs()
        .filter(p => p.scoreNote !== undefined && p.scoreNote.part === part)
        .map(p => {
          const scoreNote = p.scoreNote!
          const horizontalPosition = scoreNote.qstamp * horizontalStretch
          const basePitch = basePitchOfNote(scoreNote.pname || 'c', scoreNote.octave || 0.0)

          return (
            <NoteHead
              key={`note_${scoreNote.id}`}
              id={scoreNote.id}
              accidentals={scoreNote.accid || 0.0}
              missingNote={p.motivation === Motivation.Omission}
              active={activeScoreNote === p.scoreNote}
              x={horizontalPosition}
              y={getVerticalPosition(basePitch)}
              staffSize={staffSize}
              onClick={() => {
                setActiveScoreNote(p.scoreNote)
                if (activeMIDINote) {
                  alignedPerformance.align(activeMIDINote, activeScoreNote!)
                  triggerUpdate()

                  setActiveMIDINote(undefined)
                  setActiveScoreNote(undefined)
                }
              }} />
          )
        })
    }
  }

  const fillMidiStaff = (part: number) => {
    return (getVerticalPosition: any) => {
      return alignedPerformance.getSemanticPairs()
        .filter(p => {
          if (p.midiNote === undefined) return false

          // divide at the middle c
          if (part === 2) {
            return p.midiNote.pitch < 60
          }
          return p.midiNote.pitch >= 60
        })
        .map(p => {
          const midiNote = p.midiNote!
          const horizontalPosition = midiNote.onsetTime * horizontalStretch + horizontalShift
          // TODO: adjust accidentals to the assumed score note (if possible)
          //const basePitch = basePitchOfNote(scoreNote.pname || 'c', scoreNote.octave || 0.0)

          return (
            <rect
              key={`note_${midiNote.id}`}
              id={`midiNote_${midiNote.id}`}
              className={`midiNote ${p.motivation === Motivation.Addition && 'missingNote'}  ${(activeMIDINote === p.midiNote) && 'active'}`}
              x={horizontalPosition}
              y={getVerticalPosition(midiNote.pitch)}
              width={midiNote.duration * horizontalStretch}
              height={5}
              onClick={(e) => {
                setActiveMIDINote(midiNote)
                if (activeScoreNote) {
                  alignedPerformance.align(midiNote!, activeScoreNote)
                  triggerUpdate()
                  setActiveMIDINote(undefined)
                  setActiveScoreNote(undefined)
                }
              }} />
          )
        })
    }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        e.preventDefault()
        if (e.key === 'ArrowDown') {
          setHorizontalStretch(horizontalStretch - 10)
        }
        else if (e.key === 'ArrowUp') {
          setHorizontalStretch(horizontalStretch + 10)
        }
        else if (e.key === 'ArrowLeft') {
          setHorizontalShift(horizontalShift - 10)
        }
        else if (e.key === 'ArrowRight') {
          setHorizontalShift(horizontalShift + 10)
        }
      }}
    >
      {alignedPerformance.ready() && (
        <AlignmentActions alignedPerformance={alignedPerformance} triggerUpdate={triggerUpdate} />
      )}

      {alignedPerformance.ready() && (
        <svg
          id='alignment'
          width={2000}
          height={areaHeight + 300}
          style={{ margin: '1rem' }}>

          <g ref={(el) => el && setSvgReady(true)}>
            <g className='scoreArea' transform={`translate(0, ${100})`}>
              <System spacing={7} staffSize={staffSize}>
                <Staff clef='G' staffSize={staffSize} width={2000}>
                  {fillScoreStaff(1)}
                </Staff>
                <Staff clef='F' staffSize={staffSize} width={2000}>
                  {fillScoreStaff(2)}
                </Staff>
              </System>
            </g>

            <g className='midiArea' transform={`translate(0, ${areaHeight})`}>
              <System spacing={7} staffSize={staffSize}>
                <Staff clef='G' staffSize={staffSize} width={2000}>
                  {fillMidiStaff(1)}
                </Staff>
                <Staff clef='F' staffSize={staffSize} width={2000}>
                  {fillMidiStaff(2)}
                </Staff>
              </System>
            </g>
          </g>

          {svgReady && (
            <g className='connectionLines'>
              {alignedPerformance.getSemanticPairs()
                .filter(pair => pair.midiNote && pair.scoreNote)
                .map((pair) => {
                  const parentEl = document.querySelector('#alignment')
                  const midiNoteEl = document.querySelector(`#midiNote_${pair.midiNote!.id}`) as SVGGraphicsElement
                  const scoreNoteEl = document.querySelector(`#scoreNote_${pair.scoreNote!.id}`) as SVGGraphicsElement

                  if (!midiNoteEl || !scoreNoteEl) {
                    console.log('either midi note or score not could not be found')
                    return null
                  }

                  return (
                    <SVGElementConnector
                      parentElement={parentEl!}
                      firstElement={scoreNoteEl}
                      secondElement={midiNoteEl}
                      highlight={pair.motivation !== Motivation.ExactMatch}
                      onAltClick={() => {
                        alignedPerformance.removeAlignment(pair)
                        triggerUpdate()
                      }}
                      onClick={() => {
                        setCurrentAlignmentPair(pair)
                        setEditDialogOpen(true)
                      }} />)
              })}
            </g>
          )}
        </svg>
      )}

      <EditMotivation
        pair={currentAlignmentPair}
        changeMotivation={changeMotivation}
        dialogOpen={editDialogOpen}
        setDialogOpen={setEditDialogOpen} />
    </div >
  )
}

