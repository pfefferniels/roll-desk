import { FC, useContext, useState } from "react"
import GlobalContext from "./GlobalContext"
import { Box, IconButton, Paper } from "@mui/material"
import { Motivation, SemanticAlignmentPair } from "../lib/AlignedPerformance"
import { MidiNote } from "../lib/Performance"
import { basePitchOfNote, ScoreNote } from "../lib/Score"
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import { EditMotivation } from "./EditMotivation"
import { ExportAlignmentDialog } from "./ExportAlignmentDialog"

interface StaffLineProps {
  verticalStretch: number,
  verticalOffset: number
}

/**
 * Draws SVG staff lines using the standard F and G clef.
 */
const StaffLines: FC<StaffLineProps> = ({ verticalStretch, verticalOffset }): JSX.Element => {
  return (
    <g>
      {[43, 47, 50, 53, 57, // staff lines for left hand
        64, 67, 71, 74, 77] // for right hand
        .map(pitch => ((127 - pitch) * verticalStretch + verticalOffset))
        .map(yPosition => (
          <line
            x1={0}
            y1={yPosition}
            x2={2000}
            y2={yPosition}
            stroke='black'
            strokeWidth={0.4} />
        ))}
    </g>

  )
}

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

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        console.log(e)
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
          height={areaHeight + 300}>
          <StaffLines verticalOffset={0} verticalStretch={verticalStretch} />
          <StaffLines verticalOffset={areaHeight} verticalStretch={verticalStretch} />

          {alignedPerformance.getSemanticPairs().map((pair) => {
            const scoreNotePosition = pair.scoreNote ?
              [pair.scoreNote.qstamp * horizontalStretch,
              (127 - basePitchOfNote(pair.scoreNote.pname || 'c', pair.scoreNote.octave || 0.0)) * verticalStretch] : [,]

            const midiNotePosition = pair.midiNote ?
              [pair.midiNote.onsetTime * horizontalStretch + horizontalShift,
              (127 - pair.midiNote.pitch) * verticalStretch + areaHeight] : [,]

            return (
              <g>
                <g className='scoreArea'>
                  {pair.scoreNote && (
                    <rect key={`note_${pair.scoreNote.id}`}
                      className={`scoreNote ${pair.motivation === Motivation.Omission && 'missingNote'} ${activeScoreNote === pair.scoreNote && 'active'}`}
                      id={`scoreNote_${pair.scoreNote.id}`}
                      x={scoreNotePosition[0]}
                      y={scoreNotePosition[1]}
                      width={pair.scoreNote.duration * horizontalStretch}
                      height={5}
                      onClick={(e) => {
                        setActiveScoreNote(pair.scoreNote)
                        if (activeMIDINote) {
                          alignedPerformance.align(activeMIDINote, activeScoreNote!)
                          triggerUpdate()

                          setActiveMIDINote(undefined)
                          setActiveScoreNote(undefined)
                        }
                      }} />
                  )}
                </g>

                <g className='midiArea'>
                  {pair.midiNote && (
                    <rect key={`note_${pair.midiNote.id}`}
                      className={`midiNote ${pair.motivation === Motivation.Addition && 'missingNote'}  ${(activeMIDINote === pair.midiNote) && 'active'}`}
                      id={`midiNote_${pair.midiNote.id}`}
                      x={midiNotePosition[0]}
                      y={midiNotePosition[1]}
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
                  )}
                </g>

                {pair.midiNote && pair.scoreNote && (
                  <line
                    className='connectionLine'
                    x1={scoreNotePosition[0]}
                    y1={scoreNotePosition[1]}
                    x2={midiNotePosition[0]}
                    y2={midiNotePosition[1]}
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
                    }} />
                )}
              </g>
            )
          })
          }
        </svg>
      )}

      <EditMotivation pair={currentAlignmentPair}
        changeMotivation={changeMotivation}
        dialogOpen={editDialogOpen}
        setDialogOpen={setEditDialogOpen} />

      <ExportAlignmentDialog alignedPerformance={alignedPerformance}
        dialogOpen={exportDialogOpen}
        setDialogOpen={setExportDialogOpen} />

    </div>
  )
}

