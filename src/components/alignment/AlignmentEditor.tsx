import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import GlobalContext from "../GlobalContext"
import { Motivation, SemanticAlignmentPair } from "../../lib/AlignedPerformance"
import { MidiNote } from "../../lib/Performance"
import { basePitchOfNote, MeiNote } from "../../lib/Score"
import { EditMotivation } from "./EditMotivation"
import { SmuflSymbol } from "../score/SmuflSymbol"
import { MidiGrid, StaffGrid } from "../score/Grid"
import { System } from "../score/System"
import { SVGElementConnector } from "../SVGElementConnector"
import { AlignmentActions } from "./AlignmentActions"

type Dimensions = {
  stretch: number, // horizontal stretch
  shift: number, // horizontal shift
  staffSize: number
  areaHeight: number
}

export default function AlignmentEditor() {
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)

  const [scoreDimensions, setScoreDimensions] = useState<Dimensions>({
    shift: 60,
    stretch: 60,
    staffSize: 7,
    areaHeight: 280
  })

  const [midiDimensions, setMidiDimensions] = useState<Dimensions>({
    shift: 60,
    stretch: 60,
    staffSize: 7,
    areaHeight: 280
  })

  const maxWidth = alignedPerformance.ready() ? Math.max(alignedPerformance.score!.getMaxQstamp() * scoreDimensions.stretch + scoreDimensions.shift, 
  alignedPerformance.rawPerformance!.asNotes().at(-1)!.onsetTime * midiDimensions.stretch + midiDimensions.shift) : 0

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<MeiNote>()
  const [activeMIDINote, setActiveMIDINote] = useState<MidiNote>()
  const [svgRef, setSvgRef] = useState<number>(0)

  useEffect(() => {
    const onScroll = () => {
      const dimensions = { ...scoreDimensions }
      dimensions.shift += window.scrollX
      setScoreDimensions(dimensions)
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const changeMotivation = (pair: SemanticAlignmentPair, target: Motivation) => {
    alignedPerformance.updateMotivation(pair, target)
    triggerUpdate()
  }

  const fillScoreStaff = useCallback((part: number, getVerticalPosition: any) => {
    return alignedPerformance.getSemanticPairs()
      .filter(p => p.scoreNote !== undefined && p.scoreNote.part === part)
      .map(p => {
        const scoreNote = p.scoreNote!
        const horizontalPosition = scoreNote.qstamp * scoreDimensions.stretch + scoreDimensions.shift
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
                annotationTarget={`${scoreNote.id}_accidental`}
                x={horizontalPosition - 10}
                y={getVerticalPosition(basePitch)}
                staffSize={scoreDimensions.staffSize} />
            )}
            <SmuflSymbol
              name='noteheadBlack'
              key={`note_${scoreNote.id}`}
              annotationTarget={scoreNote.id}
              missingNote={p.motivation === Motivation.Omission}
              active={scoreNote === activeScoreNote}
              x={horizontalPosition}
              y={getVerticalPosition(basePitch)}
              staffSize={scoreDimensions.staffSize}
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
  }, [scoreDimensions, activeScoreNote, alignedPerformance])

  const fillMidiStaff = useCallback((getVerticalPosition) => {
    return alignedPerformance.getSemanticPairs()
      .filter(p => p.midiNote !== undefined)
      .map(p => {
        const midiNote = p.midiNote!
        const horizontalPosition = midiNote.onsetTime * midiDimensions.stretch + midiDimensions.shift
        // TODO: adjust accidentals to the assumed score note (if possible)
        //const basePitch = basePitchOfNote(scoreNote.pname || 'c', scoreNote.octave || 0.0)

        return (
          <rect
            key={`note_${midiNote.id}`}
            id={`midiNote_${midiNote.id}`}
            className={`midiNote ${p.motivation === Motivation.Addition && 'missingNote'}  ${(activeMIDINote === p.midiNote) && 'active'}`}
            x={horizontalPosition}
            y={getVerticalPosition(midiNote.pitch) + 400}
            width={midiNote.duration * midiDimensions.stretch}
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
  }, [midiDimensions, activeScoreNote, activeMIDINote, alignedPerformance])

  const area = useMemo(() => {
    return (
      <g ref={(el) => {
        if (el/* && !el.isEqualNode(svgRef)*/) {
          console.log('updating alignment display')
          setSvgRef(svgRef + 1)
        }
      }}>
        <g className='scoreArea' transform={`translate(0, ${100})`}>
          <System spacing={9} staffSize={scoreDimensions.staffSize}>
            <StaffGrid clef='G' staffSize={scoreDimensions.staffSize} width={maxWidth}>
              {(getVerticalPosition) =>
                <>
                  <SmuflSymbol name='gClef' x={10} y={getVerticalPosition(65)} staffSize={7} />
                  {fillScoreStaff(1, getVerticalPosition)}
                </>
              }
            </StaffGrid>
            <StaffGrid clef='F' staffSize={scoreDimensions.staffSize} width={maxWidth}>
              {(getVerticalPosition) =>
                <>
                  <SmuflSymbol name='fClef' x={10} y={getVerticalPosition(53)} staffSize={7} />
                  {fillScoreStaff(2, getVerticalPosition)}
                </>
              }
            </StaffGrid>
          </System>
        </g>

        <g className='midiArea' transform={`translate(0, ${midiDimensions.areaHeight})`}>
          <System spacing={7} staffSize={midiDimensions.staffSize}>
            <MidiGrid pitchHeight={midiDimensions.staffSize} width={maxWidth}>
              {(getVerticalPosition) => {
                return fillMidiStaff(getVerticalPosition)
              }}
            </MidiGrid>
          </System>
        </g>
      </g>
    )
  }, [scoreDimensions, midiDimensions, activeScoreNote, activeMIDINote, alignedPerformance])

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
                key={`connector_${n}_${Date.now()}`}
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
          setMidiDimensions((prev) => {
            const newDimensions = { ...prev }
            newDimensions.stretch -= 10
            return newDimensions
          })
        }
        else if (e.key === 'ArrowUp') {
          setMidiDimensions((prev) => {
            const newDimensions = { ...prev }
            newDimensions.stretch += 10
            return newDimensions
          })
        }
        else if (e.key === 'ArrowLeft') {
          setMidiDimensions((prev) => {
            const newDimensions = { ...prev }
            newDimensions.shift -= 10
            return newDimensions
          })
        }
        else if (e.key === 'ArrowRight') {
          setMidiDimensions((prev) => {
            const newDimensions = { ...prev }
            newDimensions.shift += 10
            return newDimensions
          })
        }
      }}
    >
      {alignedPerformance.ready() && (
        <AlignmentActions alignedPerformance={alignedPerformance} triggerUpdate={triggerUpdate} />
      )}

      {alignedPerformance.ready() && (
        <svg
          id='alignment'
          width={maxWidth}
          height={scoreDimensions.areaHeight + midiDimensions.areaHeight}
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

