import { FC, useContext, useEffect, useRef, useState } from "react"
import GlobalContext from "./GlobalContext"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Select, TextField } from "@mui/material"
import { Motivation, SemanticAlignmentPair } from "../lib/AlignedPerformance"
import { MidiNote } from "../lib/Performance"
import { Note } from "../lib/Score"

function midiPitchToNoteName(midiPitch: number): string {
  const notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
  return `${notes[midiPitch % 12]}${Math.floor(midiPitch / 12) - 1}`
}

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

export default function AlignmentEditor() {
  const horizontalStretch = 60
  const verticalStretch = 2.9
  const areaHeight = 127 * verticalStretch
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<Note>()
  const [activeMIDINote, setActiveMIDINote] = useState<MidiNote>()
  const [actor, setActor] = useState('')

  const removeAlignment = (pair: SemanticAlignmentPair) => {
    // remove the current alignment
    const index = alignedPerformance.semanticPairs.indexOf(pair)
    alignedPerformance.semanticPairs.splice(index, 1)

    // re-insert the two wrongly matched notes as orphanes
    alignedPerformance.semanticPairs.push({
      scoreNote: pair.scoreNote,
      motivation: Motivation.Omission
    })

    alignedPerformance.semanticPairs.push({
      midiNote: pair.midiNote,
      motivation: Motivation.Addition
    })

    triggerUpdate()
  }

  const changeMotivation = (pair: SemanticAlignmentPair, target: Motivation) => {
    const index = alignedPerformance.semanticPairs.indexOf(pair)
    if (index >= 0) {
      alignedPerformance.semanticPairs[index].motivation = target
      triggerUpdate()
    }
  }

  return (
    <div>
      {alignedPerformance.ready() && (
        <Paper style={{ position: 'fixed', padding: '0.5rem', right: 0 }}>
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
        </Paper>
      )}

      {alignedPerformance.ready() && (
        <svg width={2000} height={areaHeight + 300}>
          {alignedPerformance.getSemanticPairs().map((pair) => {
            const scoreNotePosition = pair.scoreNote ?
              [pair.scoreNote.qstamp * horizontalStretch,
              (127 - pair.scoreNote.pitch) * verticalStretch] : [,]

            const midiNotePosition = pair.midiNote ?
              [pair.midiNote.onsetTime * horizontalStretch,
              (127 - pair.midiNote.pitch) * verticalStretch + areaHeight] : [,]

            return (
              <g>
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
                        // remove a posssibly existing alignment
                        removeAlignment(pair)

                        // find the unaligned score note and attach the new MIDI note to it 
                        // as an exact match
                        const pairToModify = alignedPerformance.semanticPairs.find(other => other.scoreNote === pair.scoreNote)
                        if (pairToModify) {
                          pairToModify.midiNote = activeMIDINote
                          pairToModify.motivation = Motivation.ExactMatch
                        }

                        // remove the orphan MIDI note
                        const index = alignedPerformance.semanticPairs.findIndex(other => (other.midiNote === pair.midiNote && other.motivation === Motivation.Addition))
                        console.log('index=', index)
                        alignedPerformance.semanticPairs.splice(index, 1)

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
                        // remove a posssibly existing alignment
                        removeAlignment(pair)

                        // find the unaligned MIDI note and attach the new score note to it 
                        // as an exact match
                        const pairToModify = alignedPerformance.semanticPairs.find(other => other.midiNote === pair.midiNote)
                        if (pairToModify) {
                          pairToModify.scoreNote = activeScoreNote
                          pairToModify.motivation = Motivation.ExactMatch
                        }

                        // remove the orphan score note
                        const index = alignedPerformance.semanticPairs.findIndex(other => (other.scoreNote === pair.scoreNote && other.motivation === Motivation.Omission))
                        alignedPerformance.semanticPairs.splice(index, 1)

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
                      if (e.altKey) removeAlignment(pair)
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

    </div>
  )
}
