import { useContext, useEffect, useRef, useState } from "react"
import { Interpolation } from "../lib/Export"
import GlobalContext from "./GlobalContext"
import { parse } from "js2xmlparser"
import { Button, Paper, TextField, Typography } from "@mui/material"
import { MPM } from "../lib/Mpm"

// TODO this should be a graphical editor ...
export default function InterpolationEditor() {
    const { alignedPerformance, alignmentReady } = useContext(GlobalContext)
    const [name, setName] = useState<string>('test')
    const [beatLength, setBeatLength] = useState<number>(1)
    const [mpm, setMPM] = useState<MPM>()

    useEffect(() => {
        if (!alignmentReady || !alignedPerformance.ready()) return 

        const interpolation = new Interpolation(alignedPerformance)
        setMPM(interpolation.exportMPM(name))
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
                                   setBeatLength(+e.target.value)
                               }} />
                    <Button variant='outlined' onClick={() => {
                            const element = document.createElement("a")
                            const file = new Blob([mpm?.serialize() || ''], {type: 'text/xml'});
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

                    <div>
                        {mpm.serialize()}
                    </div>
                </div>
            )}
        </div>
    )
}
