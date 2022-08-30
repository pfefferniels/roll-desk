import { useContext, useEffect, useRef, useState } from "react"
import { Interpolation } from "../lib/Export"
import GlobalContext from "./GlobalContext"
import { parse } from "js2xmlparser"
import { Button, Paper, TextField, Typography } from "@mui/material"

// TODO this should be a graphical editor ...
export default function InterpolationEditor() {
    const { alignedPerformance, alignmentReady } = useContext(GlobalContext)
    const [name, setName] = useState<string>('test')
    const [beatLength, setBeatLength] = useState<number>(1)
    const [interpolation, setInterpolation] = useState<Interpolation>(new Interpolation(alignedPerformance, false))
    const [mpm, setMPM] = useState<any>(null)

    useEffect(() => {
        if (!alignmentReady || !alignedPerformance.ready()) return 

        const interpolation = new Interpolation(alignedPerformance, false)
        setInterpolation(interpolation)
        setMPM(interpolation.exportMPM(name, beatLength, 0))
    }, [alignmentReady, name, beatLength])

    return (
        <div>
            {alignedPerformance.ready() && (
                <Paper style={{position: 'fixed', padding: '0.5rem', top: '1rem', right: '1rem'}}>
                    <TextField variant='standard'
                               value={name}
                               label='Name of performance'
                               onChange={(e) => {
                                   setName(e.target.value)
                               }}/>
                    <Typography gutterBottom>Settings</Typography>
                    <TextField variant='standard'
                               value={beatLength}
                               label="Beat length"
                               type="number"
                               onChange={(e) => {
                                   console.log('e.target.value=', e.target.value)
                                   setBeatLength(+e.target.value)
                               }} />
                    <Button variant='outlined' onClick={() => {
                            const element = document.createElement("a")
                            const file = new Blob([parse('mpm', interpolation.exportMPM(name, beatLength, 0))], {type: 'text/xml'});
                            element.href = URL.createObjectURL(file)
                            element.download = `${name.trim()}.mpm`
                            element.click()
                    }}>Export MPM</Button>
                    <Button variant="outlined">Play</Button>
                </Paper>
            )}

            {mpm && (
                <div className="mpm">
                    <p>settings: {beatLength}</p>
                    <h4>global</h4>
                    <Dated dated={mpm.performance.global.dated} />

                    {mpm.performance.part.map((part: any) => {
                        return (
                            <div key={`part_${part['@'].name}`}>
                              <h4>{part['@'].name}</h4>
                              <Dated dated={part.dated} />
                            </div>
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
            <h5>ornamentation</h5>
            {dated.ornamentationMap && dated.ornamentationMap.ornament && dated.ornamentationMap.ornament.map((ornament: any) => {
                return (
                    <div key={`ornament_${ornament['@'].date}`}>
                        @{ornament['@'].date} – 
                        from {ornament['@']['frame.start'].toFixed(2)}, duration {ornament['@']['frameLength'].toFixed(2)}
                        <span> ({ornament['@']['note.order']})</span>
                    </div>
                )
            })}

            <h5>dynamics</h5>
            {dated.dynamicsMap && dated.dynamicsMap.dynamics && dated.dynamicsMap.dynamics.map((dynamics: any) => {
                return (
                    <div key={`dynamics_${dynamics['@'].date}`}>
                        @{dynamics['@'].date}: {dynamics['@'].volume}
                        {dynamics['@']['transition.to'] && (
                            <span> → {dynamics['@']['transition.to']}</span>
                        )}
                    </div>
                )
            })}

            <h5>tempo</h5>
            {dated.tempoMap && dated.tempoMap.tempo && dated.tempoMap.tempo.map((tempo: any) => {
                return (
                    <div key={`tempo_${tempo['@'].date}`}>@{tempo['@'].date} {tempo['@'].bpm}</div>
                )
            })}
        </div>
    )
}
