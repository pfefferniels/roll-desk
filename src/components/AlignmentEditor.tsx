import { useContext, useEffect, useRef, useState } from "react"
import GlobalContext from "./GlobalContext"
import { Box, Button, Paper, Slider, Typography } from "@mui/material"
import { AlignmentPair } from "sequence-align/src/types"

function midiPitchToNoteName(midiPitch: number): string {
  const notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
  return `${notes[midiPitch % 12]}${Math.floor(midiPitch / 12) - 1}`
}

export default function AlignmentEditor() {
  const horizontalStretch = 40
  const verticalStretch = 2
  const areaHeight = 127 * verticalStretch + 50
  const scoreRef = useRef(null)
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)

  const changeGapOpen = (event: Event, newValue: number | number[]) => {
    alignedPerformance.setGapOpen(newValue as number)
    triggerUpdate()
  }

  const changeGapExt = (event: Event, newValue: number | number[]) => {
    alignedPerformance.setGapExt(newValue as number)
    triggerUpdate()
  }

  useEffect(() => {
    if (!scoreRef.current) return

    const svgElement = (scoreRef.current as SVGElement)
    svgElement.querySelectorAll('.connectionLine').forEach(line => line.remove())

    alignedPerformance.getAllPairs().map((pair: AlignmentPair<string>, index, arr) => {
      if (pair[1] === '-') { // insertion
        const note = svgElement.querySelector(`#midiNote_${pair[0]}`)
        if (note) {
          note.setAttribute('fill', 'red')
        }
      }
      if (pair[0] === '-') { // deletion
        const note = svgElement.querySelector(`#scoreNote_${pair[1]}`)
        if (note) {
          note.setAttribute('fill', 'red')
        }
      }
      else {
        const start = svgElement.querySelector(`#midiNote_${pair[0]}`) as SVGGraphicsElement
        const end = svgElement.querySelector(`#scoreNote_${pair[1]}`) as SVGGraphicsElement
        if (start && end) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('x1', start.getBBox().x.toString())
          line.setAttribute('y1', start.getBBox().y.toString())
          line.setAttribute('x2', end.getBBox().x.toString())
          line.setAttribute('y2', end.getBBox().y.toString())
          line.setAttribute('stroke', 'black')
          line.setAttribute('class', 'connectionLine')
          svgElement.appendChild(line)
        }
      }
    })
  })

  return (
    <div>
      {alignedPerformance.ready() && (
        <Paper style={{ position: 'fixed', padding: '0.5rem', bottom: 0 }}>
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
        <svg width={2000} height={areaHeight + 200} ref={scoreRef}>
          <g className="scoreDisplay">
            {alignedPerformance.score &&
              alignedPerformance.score.allNotes().map(note => (
                <rect key={`note_${note.id}`} className='scoreNote' id={`scoreNote_${note.id}`} x={note.qstamp * horizontalStretch} y={note.pitch * verticalStretch} width={note.duration * horizontalStretch} height={5}>
                  <desc>pitch: {midiPitchToNoteName(note.pitch)}</desc>
                </rect>
              ))
            }
          </g>

          <g className="midiDisplay">
            {alignedPerformance.rawPerformance &&
              alignedPerformance.rawPerformance.asNotes().map((note => (
                <rect key={`note_${note.id}`} className='midiNote' id={`midiNote_${note.id}`} x={note.onsetTime*horizontalStretch} y={note.pitch * verticalStretch + areaHeight} width={note.duration*horizontalStretch} height={5}>
                  <desc>pitch: {midiPitchToNoteName(note.pitch)}</desc>
                </rect>
              )))
            }
          </g>

          <g className='alignmentDisplay'>
          </g>
        </svg>
      )}
    </div>
  )
}
