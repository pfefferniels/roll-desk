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
import { GraphicalGrid, StaffGrid } from "../score/Grid"
import { MSM } from "../../lib/Msm"
import { SmuflSymbol } from "../score/SmuflSymbol"
import { System } from "../score/System"

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
    const [msm, setMSM] = useState<MSM>()
    const [interpolation, setInterpolation] = useState<Interpolation>()

    const [horizontalStretch, setHorizontalStretch] = useState(0.3)

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

            {msm && (
                <div className='msm'>
                    <svg className='msm' width={2000}>
                        <System spacing={14} staffSize={7}>
                            <StaffGrid clef='G' width={2000} staffSize={7}>
                                {(getVerticalPosition: any) => {
                                    return (
                                        <g>
                                            {msm.allNotes.filter(note => note.part === 1).map(note => {
                                                const x = note.date * horizontalStretch
                                                return (
                                                    <SmuflSymbol name='noteheadBlack' staffSize={7} y={getVerticalPosition(note["midi.pitch"])} x={x} />
                                                )
                                            })}
                                        </g>
                                    )
                                }}
                            </StaffGrid>
                            <StaffGrid clef='F' width={2000} staffSize={7}>
                                {(getVerticalPosition: any) => {
                                    return (
                                        <g>
                                            {msm.allNotes.filter(note => note.part === 2).map(note => {
                                                const x = note.date * horizontalStretch
                                                return (
                                                    <SmuflSymbol name='noteheadBlack' staffSize={7} y={getVerticalPosition(note['midi.pitch'])} x={x} />
                                                )
                                            })}
                                        </g>
                                    )
                                }}
                            </StaffGrid>
                        </System>
                    </svg>
                </div>
            )}

            {mpm && (
                <div className='mpm'>
                    <svg className='mpm' width={2000}>
                        <GraphicalGrid numberOfRows={3} width={2000}>
                            {(getVerticalPosition: any) => {
                                return (
                                    <g>
                                        {mpm.getInstructions<Tempo>('tempo', 'global').map(tempo => {
                                            const x = tempo.date * horizontalStretch
                                            return (
                                                <>
                                                    <rect x={x} y={getVerticalPosition(1)} stroke='black' fill='none' width={90} height={30} />
                                                    <text x={x} y={getVerticalPosition(1) + 15}>{tempo.bpm}</text>
                                                </>
                                            )
                                        })}

                                        {mpm.getInstructions<Ornament>('ornament', 'global').map(ornament => {
                                            const x = ornament.date * horizontalStretch
                                            return (
                                                <>
                                                    <rect x={x} y={getVerticalPosition(2)} stroke='black' fill='none' width={90} height={30} />
                                                    <text x={x} y={getVerticalPosition(2) + 15}>{ornament["name.ref"]}</text>
                                                </>
                                            )
                                        })}
                                    </g>
                                )
                            }}
                        </GraphicalGrid>
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
