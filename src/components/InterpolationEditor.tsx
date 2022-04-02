import { useContext, useState } from "react"
import { Interpolation } from "../lib/Export"
import GlobalContext from "./GlobalContext"
import { parse } from "js2xmlparser"
import { Button, Checkbox, Paper, TextField, Typography } from "@mui/material"

// TODO this should be a graphical editor ...
export default function InterpolationEditor() {
    const { alignedPerformance, alignmentReady } = useContext(GlobalContext)
    const [name, setName] = useState<string>('')

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
                    <Button variant='outlined'>Export MPM</Button>
                </Paper>
            )}
            
            { alignmentReady && (
                <pre>
                    <code>
                        { parse('mpm', new Interpolation(alignedPerformance, false).exportMPM(name, 720, 20)) }
                    </code>
                </pre>
            )}
        </div>
    )
}
