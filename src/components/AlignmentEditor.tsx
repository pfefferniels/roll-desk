import { useContext, useState } from "react"
import GlobalContext from "./GlobalContext"
import { Box, IconButton, Paper } from "@mui/material"
import { Motivation, SemanticAlignmentPair } from "../lib/AlignedPerformance"
import { MidiNote } from "../lib/Performance"
import { basePitchOfNote, Score, ScoreNote } from "../lib/Score"
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import { EditMotivation } from "./EditMotivation"
import { ExportAlignmentDialog } from "./ExportAlignmentDialog"
import { NoteHead } from "./score/NoteHead"
import { StaffLines } from "./score/StaffLine"

export default function AlignmentEditor() {
  const [horizontalStretch, setHorizontalStretch] = useState(60)
  const [horizontalShift, setHorizontalShift] = useState(20)
  const verticalStretch = 2.9
  const areaHeight = 127 * verticalStretch
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<ScoreNote>()
  const [activeMIDINote, setActiveMIDINote] = useState<MidiNote>()

  const changeMotivation = (pair: SemanticAlignmentPair, target: Motivation) => {
    alignedPerformance.updateMotivation(pair, target)
    triggerUpdate()
  }

  // calculate coordinates of score notes
  const scoreNotePositions: Map<ScoreNote, [number, number]> = new Map(
    alignedPerformance.getSemanticPairs()
      .filter(pair => pair.scoreNote !== undefined)
      .map(pair => [pair.scoreNote!,
      [pair.scoreNote!.qstamp * horizontalStretch,
      (127 - basePitchOfNote(pair.scoreNote!.pname || 'c', pair.scoreNote!.octave || 0.0)) * verticalStretch]]
      ))

  // calculate coordinate of MIDI notes
  const midiNotePositions: Map<MidiNote, [number, number]> = new Map(
    alignedPerformance.getSemanticPairs()
      .filter(pair => pair.midiNote !== undefined)
      .map(pair => [pair.midiNote!, [pair.midiNote!.onsetTime * horizontalStretch + horizontalShift,
      (127 - pair.midiNote!.pitch) * verticalStretch]])
  )

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
        <Paper style={{ position: 'fixed', padding: '0.5rem', right: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              flexDirection: 'column',
            }}
          >
            <IconButton onClick={() => setExportDialogOpen(true)}>
              <FileDownloadIcon />
            </IconButton>

            <IconButton onClick={() => {
              alignedPerformance.removeAllAlignments();
              triggerUpdate()
            }}>
              <ClearIcon />
            </IconButton>
          </Box>
        </Paper>
      )}

      {alignedPerformance.ready() && (
        <svg
          width={2000}
          height={areaHeight + 300}
          style={{ margin: '1rem' }}>


          <g className='scoreArea'>
            <StaffLines staffSize={verticalStretch} width={2000} />

            {alignedPerformance.getSemanticPairs().map((pair) => {
              if (pair.scoreNote) {
                const position = scoreNotePositions.get(pair.scoreNote)
                if (!position) return null

                return (
                  <NoteHead
                    key={`note_${pair.scoreNote.id}`}
                    id={pair.scoreNote.id}
                    accidentals={pair.scoreNote.accid || 0.0}
                    missingNote={pair.motivation === Motivation.Omission}
                    active={activeScoreNote === pair.scoreNote}
                    x={position[0] || 0}
                    y={position[1] || 0}
                    staffSize={7}
                    onClick={() => {
                      setActiveScoreNote(pair.scoreNote)
                      if (activeMIDINote) {
                        alignedPerformance.align(activeMIDINote, activeScoreNote!)
                        triggerUpdate()

                        setActiveMIDINote(undefined)
                        setActiveScoreNote(undefined)
                      }
                    }} />
                )
              }
            })}
          </g>

          <g className='midiArea' transform={`translate(0, ${areaHeight})`}>
            <StaffLines staffSize={verticalStretch} width={2000} />

            {alignedPerformance.getSemanticPairs().map((pair) => {
              if (pair.midiNote) {
                const position = midiNotePositions.get(pair.midiNote)
                if (!position) return null

                return (
                  <rect
                    key={`note_${pair.midiNote.id}`}
                    id={`midiNote_${pair.midiNote.id}`}
                    className={`midiNote ${pair.motivation === Motivation.Addition && 'missingNote'}  ${(activeMIDINote === pair.midiNote) && 'active'}`}
                    x={position[0]}
                    y={position[1]}
                    width={pair.midiNote.duration * horizontalStretch}
                    height={5}
                    onClick={(e) => {
                      setActiveMIDINote(pair.midiNote)
                      if (activeScoreNote) {
                        alignedPerformance.align(pair.midiNote!, activeScoreNote)
                        triggerUpdate()
                        setActiveMIDINote(undefined)
                        setActiveScoreNote(undefined)
                      }
                    }} />
                )
              }
            })}
          </g>

          <g className='connectionLines'>
            {alignedPerformance.getSemanticPairs().map((pair) => {
              if (pair.midiNote && pair.scoreNote) {
                const scoreNotePosition = scoreNotePositions.get(pair.scoreNote)
                const midiNotePosition = midiNotePositions.get(pair.midiNote)

                if (!scoreNotePosition || !midiNotePosition) return null

                return (
                  <line
                    className='connectionLine'
                    x1={scoreNotePosition[0]}
                    y1={scoreNotePosition[1]}
                    x2={midiNotePosition[0]}
                    y2={(midiNotePosition[1] || 0) + areaHeight}
                    stroke={pair.motivation === Motivation.ExactMatch ? 'black' : 'blue'}
                    onClick={(e) => {
                      if (e.altKey) {
                        alignedPerformance.removeAlignment(pair)
                        triggerUpdate()
                      }
                      else {
                        setCurrentAlignmentPair(pair)
                        setEditDialogOpen(true)
                      }
                    }} />)
              }
            })}
          </g>
        </svg>
      )}

      <EditMotivation pair={currentAlignmentPair}
        changeMotivation={changeMotivation}
        dialogOpen={editDialogOpen}
        setDialogOpen={setEditDialogOpen} />

      <ExportAlignmentDialog alignedPerformance={alignedPerformance}
        dialogOpen={exportDialogOpen}
        setDialogOpen={setExportDialogOpen} />

    </div >
  )
}

