import { useContext, useEffect, useRef, useState } from "react"
import GlobalContext from "./GlobalContext"
import { Box, Button, Paper, Slider, Typography } from "@mui/material"
import { AlignmentPair } from "sequence-align/src/types"

export default function AlignmentEditor() {
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
    if (!alignmentReady) return

    console.log('update triggered')

    if (scoreRef.current) {
      (scoreRef.current as HTMLElement).innerHTML = alignedPerformance.score!.asSVG()
    }

    document.querySelector("svg")?.querySelectorAll("[fill]").forEach((value: Element) => value.removeAttribute("fill"))
    
    alignedPerformance.getAllPairs().map((pair: AlignmentPair<string>, index, arr) => {
      const ref: HTMLElement = scoreRef.current as unknown as HTMLElement || null
      if (ref) {
          if (pair[1] === '-') { // insertion
            //el?.setAttribute('fill', 'blue')
            return
          }

          const el = ref.querySelector('#' + pair[1])
          if (!el) return

          if (pair[0] === '-') { // deletion
            el.setAttribute('fill', 'red')
          }
          else {
            if (alignedPerformance.performedNoteAtIndex(Number(pair[0]))?.pitch !==
                alignedPerformance.noteAtId(pair[1])?.pitch) {
              el.setAttribute('fill', 'orange')
            }
            else {
              el.setAttribute('fill', 'green')
              el.setAttribute('data-alignment', pair[0])
            }
          }
      }
    })
  }, [alignmentReady])

  return (
      <div>
        {alignedPerformance.ready() && (
          <Paper style={{position: 'fixed', padding: '0.5rem'}}>
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

        <div className="scoreDisplay" ref={scoreRef}/>
      </div>
  )
}
