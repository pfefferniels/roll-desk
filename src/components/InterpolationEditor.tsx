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
    const [mpm, setMPM] = useState<any>(null)

    useEffect(() => {
        if (!alignmentReady || !alignedPerformance.ready()) return 

        const interpolation = new Interpolation(alignedPerformance, false)
        setInterpolation(interpolation)
        setMPM(interpolation.exportMPM('test', 0, 0))
    }, [alignmentReady])

    return (
        <div>
            {alignedPerformance.ready() && (
                <Paper style={{position: 'fixed', padding: '0.5rem', bottom: '1rem'}}>
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

            {mpm && (
                <div className="mpm">
                    <h4>global</h4>
                    <Dated dated={mpm.performance.global.dated} />

                    {mpm.performance.part.map((part: any) => {
                        return (
                            <>
                              <h4>{part['@'].name}</h4>
                              <Dated dated={part.dated} />
                            </>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const Dated = (props: {dated: any}) => {
    const { dated } = props

    return (
        <div>
            <h5>dynamics</h5>
            {dated.dynamicsMap && dated.dynamicsMap.dynamics && dated.dynamicsMap.dynamics.map((dynamics: any) => {
                return (
                    <div>@{dynamics['@'].date} {dynamics['@'].volume}</div>
                )
            })}

            <h5>tempo</h5>
            {dated.tempoMap && dated.tempoMap.tempo && dated.tempoMap.tempo.map((tempo: any) => {
                return (
                    <div>@{tempo['@'].date} {tempo['@'].bpm}</div>
                )
            })}
        </div>
    )
}
