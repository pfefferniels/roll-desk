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
import { MPMGrid } from "../grids/MPMGrid"
import { MSMGrid } from "../grids/MSMGrid"
import { downloadFile } from "../../lib/globals"
import { Player } from "../player/Player"
import { MidiFile, read } from "midifile-ts"
import { PlaybackPosition } from "../player/PlaybackPosition"
import { Mei } from "../../lib/Score"

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
    const [midi, setMidi] = useState<MidiFile>()
    const [interpolation, setInterpolation] = useState<Interpolation>()

    const [playbackPosition, setPlaybackPosition] = useState(0)

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
            const data = await response.arrayBuffer()
            setMidi(read(data))
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

            {midi ? (
                <Player midi={midi} onProgress={(progress) => {
                    // since alignedPerformance.ready() is true, we 
                    // can safely assume that performance and score are defined
                    const perf = alignedPerformance.rawPerformance!

                    const nearestMidiNote = perf.nearestNote(progress * (perf.totalDuration() || 0))
                    if (!nearestMidiNote) return

                    const pair = alignedPerformance.getSemanticPairs().find(pair => pair.midiNote?.id === nearestMidiNote.id)
                    if (!pair || !pair.scoreNote) return

                    const symbolicalPosition = Mei.qstampToTstamp(pair.scoreNote.qstamp)
                    setPlaybackPosition(symbolicalPosition)
                }} />)
                : <span>failed loading MIDI</span>}

            {msm && (
                <div className='msm'>
                    <svg className='msm' width={msm.lastDate() * horizontalStretch}>
                        <MSMGrid msm={msm} horizontalStretch={horizontalStretch} />
                        <PlaybackPosition position={playbackPosition * horizontalStretch} />
                    </svg>
                </div>
            )}

            {mpm && (
                <div className='mpm'>
                    <svg className='mpm' height={300} width={(msm?.lastDate() || 0) * horizontalStretch}>
                        <MPMGrid mpm={mpm} horizontalStretch={horizontalStretch} />
                        <PlaybackPosition position={playbackPosition * horizontalStretch} />
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

