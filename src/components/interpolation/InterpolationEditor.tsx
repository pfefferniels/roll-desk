import { useContext, useEffect, useState } from "react"
import { Interpolation } from "../../lib/Interpolation"
import GlobalContext from "../GlobalContext"
import { Box, IconButton, Paper } from "@mui/material"
import { MPM, Ornament, Tempo } from "../../lib/Mpm"
import LayersIcon from '@mui/icons-material/Layers';
import EditAttributesIcon from '@mui/icons-material/EditAttributes';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { PipelineEditor } from "./pipeline-editor/PipelineEditor"
import { EditMetadata } from "./EditMetadata"

// TODO this should be a graphical editor ...
export default function InterpolationEditor() {
    const { alignedPerformance, alignmentReady } = useContext(GlobalContext)

    const [performanceName, setPerformanceName] = useState('unknown performance')
    const [author, setAuthor] = useState('unknown')
    const [comment, setComment] = useState(`generated using the MPM interpolation tool from the` +
        `"Measuring Early Records" project`)

    const [editPipelineOpen, setEditPipelineOpen] = useState(false)
    const [editMetadataOpen, setEditMetadataOpen] = useState(false)

    const [mpm, setMPM] = useState<MPM>()
    const [interpolation, setInterpolation] = useState<Interpolation>()

    useEffect(() => {
        if (!alignmentReady || !alignedPerformance.ready()) return

        setInterpolation(new Interpolation(alignedPerformance))
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
                        }}
                    >
                        <IconButton onClick={() => setEditMetadataOpen(true)}>
                            <EditAttributesIcon />
                        </IconButton>
                        <IconButton onClick={() => setEditPipelineOpen(true)}>
                            <LayersIcon />
                        </IconButton>
                        <IconButton onClick={() => {
                            const element = document.createElement('a')
                            const file = new Blob([mpm?.serialize() || ''], { type: 'text/xml' });
                            element.href = URL.createObjectURL(file)
                            element.download = `${performanceName.trim()}.mpm`
                            element.click()
                        }}>
                            <FileDownloadIcon />
                        </IconButton>
                    </Box>
                </Paper>
            )}

            {mpm && (
                <div className='mpm'>
                    <svg className='overallSvg' width={2000}>
                        {mpm.getInstructions<Tempo>('tempo', 'global').map(tempo => {
                            const x = tempo.date / 2
                            return (
                                <>
                                  <rect x={x} y={30} stroke='black' fill='none' width={90} height={30} />
                                  <text x={x} y={45}>{tempo.bpm}</text>
                                </>
                            )
                        })}
                        {mpm.getInstructions<Ornament>('ornament', 'global').map(ornament => {
                            const x = ornament.date / 2
                            return (
                                <>
                                  <rect x={x} y={70} stroke='black' fill='none' width={90} height={30} />
                                  <text x={x} y={85}>{ornament["name.ref"]}</text>
                                </>
                            )
                        })}
                    </svg>
                    <pre>
                        {mpm.serialize()}
                    </pre>
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
