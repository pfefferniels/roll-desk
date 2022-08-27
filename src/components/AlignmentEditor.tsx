import { FC, useContext, useState } from "react"
import GlobalContext from "./GlobalContext"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Select, TextField } from "@mui/material"
import { AlignedPerformance, Motivation, SemanticAlignmentPair } from "../lib/AlignedPerformance"
import { MidiNote } from "../lib/Performance"
import { Note } from "../lib/Score"
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';

interface EditMotivationProps {
  pair?: SemanticAlignmentPair,
  changeMotivation: (pair: SemanticAlignmentPair, target: Motivation) => void,
  dialogOpen: boolean,
  setDialogOpen: (open: boolean) => void
}

const EditMotivation: FC<EditMotivationProps> = ({ pair, changeMotivation, dialogOpen, setDialogOpen }): JSX.Element => {
  return (
    <Dialog open={dialogOpen}>
      <DialogTitle>Edit Alignment Motivation</DialogTitle>
      <DialogContent>
        <Select value={pair?.motivation}
          onChange={(e) => {
            changeMotivation(pair!, e.target.value as Motivation)
          }}>
          <MenuItem value={Motivation.ExactMatch}>Exact Match</MenuItem>
          <MenuItem value={Motivation.Error}>Error</MenuItem>
          <MenuItem value={Motivation.Ornamentation}>Ornamentation</MenuItem>
          <MenuItem value={Motivation.Alteration}>Alteration</MenuItem>
          <MenuItem value={Motivation.OctaveAddition}>Octave Addition</MenuItem>
          <MenuItem value={Motivation.Uncertain}>Uncertain</MenuItem>
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setDialogOpen(false)
        }}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

interface ExportDialogProps {
  alignedPerformance: AlignedPerformance,
  dialogOpen: boolean,
  setDialogOpen: (open: boolean) => void
}

const ExportDialog: FC<ExportDialogProps> = ({ alignedPerformance, dialogOpen, setDialogOpen }): JSX.Element => {
  const [actor, setActor] = useState('')

  return (
    <Dialog open={dialogOpen}>
      <DialogTitle>Export</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            flexDirection: 'column',
          }}
        >
          <TextField
            sx={{ m: 1 }}
            variant='standard'
            label='alignment carried out by'
            value={actor}
            onChange={(e) => {
              setActor(e.target.value)
            }} />
          <Button
            sx={{ m: 1 }}
            variant='outlined'
            onClick={() => {
              const element = document.createElement('a')
              const file = new Blob([alignedPerformance.rawPerformance?.serializeToRDF() || ''], { type: 'application/ld+json' });
              element.href = URL.createObjectURL(file)
              element.download = `midi.jsonld`
              element.click()
            }}>Export MIDI as RDF</Button>
          <br />

          <Button
            sx={{ m: 1 }}
            variant='outlined'
            onClick={() => {
              const element = document.createElement('a')
              const file = new Blob([alignedPerformance.score?.serializeToRDF() || ''], { type: 'application/ld+json' });
              element.href = URL.createObjectURL(file)
              element.download = `score.jsonld`
              element.click()
            }}>Export Score as RDF</Button>
          <br />

          <Button
            sx={{ m: 1 }}
            variant='outlined'
            onClick={() => {
              const element = document.createElement('a')
              const file = new Blob([alignedPerformance.serializeToRDF(actor) || ''], { type: 'application/ld+json' });
              element.href = URL.createObjectURL(file)
              element.download = `alignment.jsonld`
              element.click()
            }}>Export Alignments as RDF</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setDialogOpen(false)
        }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

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
  const verticalStretch = 2.9
  const areaHeight = 127 * verticalStretch
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<Note>()
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
          {alignedPerformance.getSemanticPairs().map((pair) => {
            const scoreNotePosition = pair.scoreNote ?
              [pair.scoreNote.qstamp * horizontalStretch,
              (127 - pair.scoreNote.pitch) * verticalStretch] : [,]

            const midiNotePosition = pair.midiNote ?
              [pair.midiNote.onsetTime * horizontalStretch,
              (127 - pair.midiNote.pitch) * verticalStretch + areaHeight] : [,]

            return (
              <g>
                <StaffLines verticalOffset={0} verticalStretch={verticalStretch} />
                <StaffLines verticalOffset={areaHeight} verticalStretch={verticalStretch} />

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

                {pair.midiNote && pair.scoreNote && (
                  <line x1={scoreNotePosition[0]}
                    y1={scoreNotePosition[1]}
                    x2={midiNotePosition[0]}
                    y2={midiNotePosition[1]}
                    stroke={pair.motivation === Motivation.ExactMatch ? 'black' : 'blue'}
                    strokeWidth={3}
                    strokeOpacity={0.3}
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

      <ExportDialog alignedPerformance={alignedPerformance}
        dialogOpen={exportDialogOpen}
        setDialogOpen={setExportDialogOpen} />

    </div>
  )
}

