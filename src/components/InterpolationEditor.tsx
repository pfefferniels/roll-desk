import { useContext, useEffect, useRef, useState } from "react"
import { Interpolation } from "../lib/Export"
import GlobalContext from "./GlobalContext"
import { parse } from "js2xmlparser"
import { Button, Checkbox, Paper, TextField, Typography } from "@mui/material"
import { Note } from "../lib/Score"

// TODO this should be a graphical editor ...
export default function InterpolationEditor() {
    const { alignedPerformance, alignmentReady } = useContext(GlobalContext)
    const [name, setName] = useState<string>('')
    const [interpolation, setInterpolation] = useState<Interpolation>(new Interpolation(alignedPerformance, false))
    const scoreRef = useRef(null)

    useEffect(() => {
        if (!alignmentReady || !alignedPerformance.ready()) return 

        if (scoreRef.current) {
          (scoreRef.current as HTMLElement).innerHTML = alignedPerformance.score!.asSVG()
        }
        setInterpolation(new Interpolation(alignedPerformance, false))
    }, [alignmentReady])

    useEffect(() => {
        if (!alignedPerformance.ready()) return

        const score = document.querySelector("#interpolationScore")
        if (!score) return

        const tempos = interpolation.exportTempoMap(720, 20)
        for (const tempo of tempos) {
            const date = tempo.date / 720
            const correspondingNoteIds = alignedPerformance.score!.notesAtTime(date).map((note: Note) => note.id)
            if (!correspondingNoteIds.length) continue

            const el = score.querySelector(`#${correspondingNoteIds[0]}`) as SVGGraphicsElement
            if (!el) {
                console.log('no corresponding SVG element found')
                continue
            }
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            text.textContent = tempo.bpm.toString() + (tempo["transition.to"] && '→')
            text.setAttribute('class', 'tempo-instruction')
            text.setAttribute('fill', 'red')
            text.setAttribute('x', el.getBBox().x.toString())
            text.setAttribute('y', el.getBBox().y.toString())
            text.setAttribute('font-size', '20rem')
            if (el.parentNode) el.parentNode.appendChild(text)
        }
    }, [interpolation])

    return (
        <div>
            {alignedPerformance.ready() && (
                <Paper style={{position: 'fixed', padding: '0.5rem'}}>
                    <TextField variant='standard'
                               label='Name of performance'
                               onChange={(e) => {
                                   setName(e.target.value)
                               }}/>
                    <Typography gutterBottom>Settings</Typography>
                    <Button variant='outlined' onClick={() => {
                            const element = document.createElement("a")
                            const file = new Blob([parse('mpm', interpolation.exportMPM(name, 0, 0))], {type: 'text/xml'});
                            element.href = URL.createObjectURL(file)
                            element.download = `${name.trim()}.mpm`
                            element.click()
                    }}>Export MPM</Button>
                    <Button variant="outlined">Play</Button>
                </Paper>
            )}

            <div className="scoreDisplay" id="interpolationScore" ref={scoreRef}/>
        </div>
    )
}
