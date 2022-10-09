import { useContext, useEffect, useState } from "react"
import { Interpolation } from "../../lib/Interpolation"
import GlobalContext from "../GlobalContext"
import { Box, IconButton, Paper } from "@mui/material"
import { MPM } from "../../lib/Mpm"
import LayersIcon from '@mui/icons-material/Layers';
import EditAttributesIcon from '@mui/icons-material/EditAttributes';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { PipelineEditor } from "./pipeline-editor/PipelineEditor"
import { EditMetadata } from "./EditMetadata"
import { MSM } from "../../lib/Msm"
import { MPMGrid } from "./MPMGrid"
import { MSMGrid } from "./MSMGrid"
import { downloadFile } from "../../lib/globals"

export default function InterpolationEditor() {
    const { alignedPerformance, alignmentReady } = useContext(GlobalContext)

    const [performanceName, setPerformanceName] = useState('unknown performance')
    const [author, setAuthor] = useState('unknown')
    const [comment, setComment] = useState(`generated using the MPM interpolation tool from the` +
        `"Measuring Early Records" project`)

    const [editPipelineOpen, setEditPipelineOpen] = useState(false)
    const [editMetadataOpen, setEditMetadataOpen] = useState(false)

    const [mpm, setMPM] = useState<MPM>()
    const [msm, setMSM] = useState<MSM>()
    const [interpolation, setInterpolation] = useState<Interpolation>()

    const [horizontalStretch, setHorizontalStretch] = useState(0.3)

    useEffect(() => {
        if (!mpm) return

        const fetchMidi = async () => {
            const response = await fetch('http://0.0.0.0:8080/convert', {
                method: 'POST',
                headers: {
                  'Accept': 'application/octet-stream',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    msm: msm?.serialize() || '',
                    mpm: mpm.serialize()
                })
              })
            const data = response.arrayBuffer()
            console.log('data=', data)
        }

        fetchMidi()
    }, [mpm])

    useEffect(() => {
        if (!alignmentReady || !alignedPerformance.ready()) return

        setInterpolation(new Interpolation(alignedPerformance))
        setMSM(new MSM(alignedPerformance))
    }, [alignmentReady])

    const updateMPM = () => {
        if (!interpolation) return
        setMPM(interpolation.exportMPM(performanceName))
    }

    useEffect(updateMPM, [interpolation])

    useEffect(() => {
        if (!interpolation) return

        interpolation.setAuthor(author)
        interpolation.setComment(comment)
        interpolation.setPerformanceName(performanceName)
    }, [performanceName, author, comment])

    return (
        <div>
            {alignedPerformance.ready() && (
                <Paper style={{ position: 'fixed', padding: '0.5rem', right: 0 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            flexDirection: 'column',
                        }}>
                        <IconButton onClick={() => setEditMetadataOpen(true)}>
                            <EditAttributesIcon />
                        </IconButton>
                        <IconButton onClick={() => setEditPipelineOpen(true)}>
                            <LayersIcon />
                        </IconButton>
                        <IconButton onClick={() => downloadFile(`${performanceName.trim()}.mpm`, mpm?.serialize() || '', 'text/xml')}>
                            <FileDownloadIcon />
                        </IconButton>
                    </Box>
                </Paper>
            )}

            {msm && (
                <div className='msm'>
                    <svg className='msm' width={2000}>
                        <MSMGrid msm={msm} horizontalStretch={horizontalStretch} />
                    </svg>
                </div>
            )}

            {mpm && (
                <div className='mpm'>
                    <svg className='mpm' height={300} width={2000}>
                        <MPMGrid mpm={mpm} horizontalStretch={horizontalStretch} />
                    </svg>
                </div>
            )}

            <PipelineEditor
                pipeline={interpolation?.pipeline}
                onReady={() => {
                    updateMPM()
                    setEditPipelineOpen(false)
                }}
                dialogOpen={editPipelineOpen} />

            <EditMetadata
                author={author}
                setAuthor={setAuthor}
                comment={comment}
                setComment={setComment}
                performanceName={performanceName}
                setPerformanceName={setPerformanceName}
                onReady={() => {
                    updateMPM()
                    setEditMetadataOpen(false)
                }}
                dialogOpen={editMetadataOpen} />
        </div>
    )
}

