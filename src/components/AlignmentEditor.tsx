import { FC, useContext, useEffect, useRef, useState } from "react"
import GlobalContext from "./GlobalContext"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Slider, TextField, Typography } from "@mui/material"
import { AlignmentPair } from "sequence-align/src/types"
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
        <div>current motivation: {pair?.motivation}</div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          changeMotivation(pair!, Motivation.OctaveAlteration)
          setDialogOpen(false)
        }}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function AlignmentEditor() {
  const horizontalStretch = 60
  const verticalStretch = 2.5
  const areaHeight = 127 * verticalStretch
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<Note>()
  const [activeMIDINote, setActiveMIDINote] = useState<MidiNote>()

  const changeGapOpen = (event: Event, newValue: number | number[]) => {
    alignedPerformance.setGapOpen(newValue as number)
    triggerUpdate()
  }

  const changeGapExt = (event: Event, newValue: number | number[]) => {
    alignedPerformance.setGapExt(newValue as number)
    triggerUpdate()
  }

  const removeAlignment = (pair: SemanticAlignmentPair) => {
    // remove the current alignment
    const index = alignedPerformance.semanticPairs.indexOf(pair)
    alignedPerformance.semanticPairs.splice(index, 1)

    // insert two gap alignments
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
          <Typography gutterBottom>Penalty for opening a new gap</Typography>
          <Slider
            getAriaLabel={() => 'gap open score'}
            value={alignedPerformance.gapOpen}
            onChange={changeGapOpen}
            valueLabelDisplay="auto"
            min={-15}
            max={0}
            marks={true}
          />

          <Typography gutterBottom>penalty for extending an existing gap</Typography>
          <Slider
            getAriaLabel={() => 'gap ext score'}
            value={alignedPerformance.gapExt}
            onChange={changeGapExt}
            valueLabelDisplay="auto"
            min={-15}
            max={0}
            marks={true}
          />

          <Button variant='outlined'>Export MEI</Button>
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
                    className='scoreNote'
                    id={`scoreNote_${pair.scoreNote.id}`}
                    x={scoreNotePosition[0]}
                    y={scoreNotePosition[1]}
                    width={pair.scoreNote.duration * horizontalStretch}
                    height={7}
                    onClick={(e) => {
                      setActiveScoreNote(pair.scoreNote)
                      if (activeMIDINote) {
                        // remove the unaligned MIDI note from the alignments array
                        const index = alignedPerformance.semanticPairs.findIndex(other => other.midiNote === pair.midiNote)
                        alignedPerformance.semanticPairs.splice(index, 1)

                        // find the unaligned score note and attach the new MIDI note to it 
                        // as an exact match
                        const pairToModify = alignedPerformance.semanticPairs.find(other => other.scoreNote === pair.scoreNote)
                        if (pairToModify) {
                          pairToModify.midiNote = activeMIDINote
                          pairToModify.motivation = Motivation.ExactMatch
                        }
                        triggerUpdate()
                        setActiveMIDINote(undefined)
                        setActiveScoreNote(undefined)
                      }
                    }} />
                )}

                {pair.midiNote && (
                  <rect key={`note_${pair.midiNote.id}`}
                    className='midiNote'
                    id={`midiNote_${pair.midiNote.id}`}
                    x={midiNotePosition[0]}
                    y={midiNotePosition[1]}
                    width={pair.midiNote.duration * horizontalStretch}
                    height={7}
                    onClick={(e) => {
                      setActiveMIDINote(pair.midiNote)
                      if (activeScoreNote) {
                        // remove the unaligned score note from the alignments array
                        const index = alignedPerformance.semanticPairs.findIndex(other => other.scoreNote === pair.scoreNote)
                        alignedPerformance.semanticPairs.splice(index, 1)

                        // find the unaligned MIDI note and attach the new score note to it 
                        // as an exact match
                        const pairToModify = alignedPerformance.semanticPairs.find(other => other.midiNote === pair.midiNote)
                        if (pairToModify) {
                          pairToModify.scoreNote = activeScoreNote
                          pairToModify.motivation = Motivation.ExactMatch
                        }
                        triggerUpdate()
                        setActiveMIDINote(undefined)
                        setActiveScoreNote(undefined)
                      }
                    }} />
                )}

                {(pair.midiNote && pair.scoreNote) && (
                  <line x1={scoreNotePosition[0]}
                    y1={scoreNotePosition[1]}
                    x2={midiNotePosition[0]}
                    y2={midiNotePosition[1]}
                    stroke={pair.motivation === Motivation.ExactMatch ? 'black' : 'blue'}
                    strokeWidth={2}
                    strokeOpacity={0.8}
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
