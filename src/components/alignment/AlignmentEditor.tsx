import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import GlobalContext from "../GlobalContext"
import { Motivation, SemanticAlignmentPair } from "../../lib/AlignedPerformance"
import { MidiNote } from "../../lib/Performance"
import { basePitchOfNote, ScoreNote } from "../../lib/Score"
import { EditMotivation } from "./EditMotivation"
import { SmuflSymbol } from "../score/SmuflSymbol"
import { Grid } from "../score/Grid"
import { System } from "../score/System"
import { SVGElementConnector } from "../SVGElementConnector"
import { AlignmentActions } from "./AlignmentActions"

export default function AlignmentEditor() {
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)

  const [horizontalStretch, setHorizontalStretch] = useState(60)
  const [horizontalShift, setHorizontalShift] = useState(60)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<ScoreNote>()
  const [activeMIDINote, setActiveMIDINote] = useState<MidiNote>()
  const [svgRef, setSvgRef] = useState<number>(0)

  useEffect(() => console.log('update'), [svgRef])

  const verticalStretch = 2.9
  const staffSize = 7
  const areaHeight = 127 * verticalStretch

  const changeMotivation = (pair: SemanticAlignmentPair, target: Motivation) => {
    alignedPerformance.updateMotivation(pair, target)
    triggerUpdate()
  }

  const fillScoreStaff = useCallback((part: number, getVerticalPosition: any) => {
    return alignedPerformance.getSemanticPairs()
      .filter(p => p.scoreNote !== undefined && p.scoreNote.part === part)
      .map(p => {
        const scoreNote = p.scoreNote!
        const horizontalPosition = scoreNote.qstamp * horizontalStretch + horizontalShift
        const basePitch = basePitchOfNote(scoreNote.pname || 'c', scoreNote.octave || 0.0)

        if (scoreNote === activeScoreNote) {
          console.log('found')
        }

        return (
          <>
            {scoreNote.accid && scoreNote.accid !== 0 && (
              <SmuflSymbol
                name={{
                  '-2': 'accidentalDoubleFlat',
                  '-1': 'accidentalFlat',
                  '1': 'accidentalSharp',
                  '2': 'accidentalDoubleSharp'
                }[scoreNote.accid.toString()] || ''}
                id={`${scoreNote.id}_accidental`}
                x={horizontalPosition - 10}
                y={getVerticalPosition(basePitch)}
                staffSize={staffSize} />
            )}
            <SmuflSymbol
              name='noteheadBlack'
              key={`note_${scoreNote.id}`}
              id={scoreNote.id}
              missingNote={p.motivation === Motivation.Omission}
              active={scoreNote === activeScoreNote}
              x={horizontalPosition}
              y={getVerticalPosition(basePitch)}
              staffSize={staffSize}
              onClick={() => {
                console.log('setting active score note to', p.scoreNote)
                setActiveScoreNote(p.scoreNote)
                if (activeMIDINote) {
                  alignedPerformance.align(activeMIDINote, activeScoreNote!)
                  setActiveMIDINote(undefined)
                  setActiveScoreNote(undefined)
                  triggerUpdate()
                }
              }} />
          </>
        )
      })
  }, [horizontalStretch, activeScoreNote, alignedPerformance])

  const fillMidiStaff = useCallback((part: number) => {
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
                  setActiveMIDINote(undefined)
                  setActiveScoreNote(undefined)
                  triggerUpdate()
                }
              }} />
          )
        })
    }
  }, [horizontalShift, horizontalStretch, activeScoreNote, activeMIDINote, alignedPerformance])

  const area = useMemo(() => {
    return (
      <g ref={(el) => {
        if (el/* && !el.isEqualNode(svgRef)*/) {
          console.log('updateing!')
          setSvgRef(svgRef + 1)
        }
      }}>
        <g className='scoreArea' transform={`translate(0, ${100})`}>
          <System spacing={9} staffSize={staffSize}>
            <Grid type='music-staff' clef='G' staffSize={staffSize} width={2000}>
              {(getVerticalPosition) =>
                <>
                  <SmuflSymbol name='gClef' x={10} y={getVerticalPosition(65)} staffSize={7} />
                  {fillScoreStaff(1, getVerticalPosition)}
                </>
              }
            </Grid>
            <Grid type='music-staff' clef='F' staffSize={staffSize} width={2000}>
              {(getVerticalPosition) =>
                <>
                  <SmuflSymbol name='fClef' x={10} y={getVerticalPosition(53)} staffSize={7} />
                  {fillScoreStaff(2, getVerticalPosition)}
                </>
              }
            </Grid>
          </System>
        </g>

        <g className='midiArea' transform={`translate(0, ${areaHeight})`}>
          <System spacing={7} staffSize={staffSize}>
            <Grid type='midi' clef='G' staffSize={staffSize} width={2000}>
              {fillMidiStaff(1)}
            </Grid>
            <Grid type='midi' clef='F' staffSize={staffSize} width={2000}>
              {fillMidiStaff(2)}
            </Grid>
          </System>
        </g>
      </g>
    )
  }, [horizontalShift, horizontalStretch, activeScoreNote, activeMIDINote, alignedPerformance])

  const connectors = useMemo(() => {
    if (!svgRef) return null

    return (
      <g className='connectionLines'>
      {alignedPerformance.getSemanticPairs()
        .filter(pair => pair.midiNote && pair.scoreNote)
        .map((pair, n) => {
          const parentEl = document.querySelector('#alignment')
          const midiNoteEl = document.querySelector(`#midiNote_${pair.midiNote!.id}`)
          const scoreNoteEl = document.querySelector(`#scoreNote_${pair.scoreNote!.id}`)

          if (!parentEl || !midiNoteEl || !scoreNoteEl) {
            console.log('either midi note or score note could not be found')
            return null
          }

          return (
            <SVGElementConnector
              key={`connector_${n}_${Date.now()}_${horizontalShift}`}
              parentElement={parentEl}
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
    )
  }, [svgRef, currentAlignmentPair, alignmentReady, alignedPerformance])

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
          {area}
          {connectors}
        </svg>
      )}

      <EditMotivation
        pair={currentAlignmentPair}
        changeMotivation={changeMotivation}
        dialogOpen={editDialogOpen}
        setDialogOpen={setEditDialogOpen} />
    </div>
  )
}

