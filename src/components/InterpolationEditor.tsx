import { useContext, useEffect, useRef, useState } from "react"
import { Interpolation } from "../lib/Export"
import GlobalContext from "./GlobalContext"
import { parse } from "js2xmlparser"
import { Box, Button, IconButton, Paper, TextField, Typography } from "@mui/material"
import { MPM } from "../lib/Mpm"
import LayersIcon from '@mui/icons-material/Layers';
import EditAttributesIcon from '@mui/icons-material/EditAttributes';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

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
                <Paper style={{ position: 'fixed', padding: '0.5rem', right: 0 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            flexDirection: 'column',
                        }}
                    >
                        <IconButton onClick={() => { }}>
                            <EditAttributesIcon />
                        </IconButton>
                        <IconButton onClick={() => { }}>
                            <LayersIcon />
                        </IconButton>
                        <IconButton onClick={() => {
                            const element = document.createElement("a")
                            const file = new Blob([mpm?.serialize() || ''], { type: 'text/xml' });
                            element.href = URL.createObjectURL(file)
                            element.download = `${name.trim()}.mpm`
                            element.click()
                        }}>
                            <FileDownloadIcon />
                        </IconButton>
                    </Box>
                </Paper>
            )}

            {mpm && (
                <div className="mpm">
                    <p>settings: {beatLength}</p>
                    <h4>global</h4>

                    <pre>
                        {mpm.serialize()}
                    </pre>
                </div>
            )}
        </div>
    )
}
