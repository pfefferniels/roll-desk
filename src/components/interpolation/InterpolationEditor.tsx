import { useContext, useEffect, useState } from "react"
import { GlobalContext } from "../../providers"
import { Box, IconButton, Paper } from "@mui/material"
import { MPM } from "../../lib/mpm"
import LayersIcon from '@mui/icons-material/Layers';
import EditAttributesIcon from '@mui/icons-material/EditAttributes';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { PipelineEditor } from "./pipeline-editor/PipelineEditor"
import { EditMetadata } from "./EditMetadata"
import { MSM } from "../../lib/msm"
import { MPMGrid } from "../grids/MPMGrid"
import { MSMGrid } from "../grids/MSMGrid"
import { downloadFile } from "../../lib/globals"
import { Player } from "../player/Player"
import { MidiFile, read } from "midifile-ts"
import { PlaybackPosition } from "../player/PlaybackPosition"
import { Mei } from "../../lib/mei"
import { MIDIGrid } from "../grids"
import { RawPerformance } from "../../lib/midi/RawPerformance"
import { defaultPipelines, Pipeline, PipelineName } from "../../lib/transformers"

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
    const [pipeline, setPipeline] = useState<Pipeline>(defaultPipelines['chordal-texture'])

    const [playbackPosition, setPlaybackPosition] = useState(0)

    const [horizontalStretch, setHorizontalStretch] = useState(0.3)

    const changePipelinePreset = (newPreset: PipelineName) => {
        setPipeline(defaultPipelines[newPreset])
    }

    useEffect(() => {
        if (!mpm) return

        // when the MPM changes, load the new rendered MIDI from server
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

    const calculateMPM = () => {
        if (!alignmentReady || !alignedPerformance.ready()) return

        // kick-off pipeline
        if (!pipeline.head) {
            console.log('No pipeline has been configured. The resulting MPM will be empty.')
            return
        }

        // create a fresh MSM and MPM
        const newMSM = new MSM(alignedPerformance)
        const newMPM = new MPM(2)

        pipeline.head.transform(newMSM, newMPM)
        newMPM.setMetadata({
            authors: [author],
            comments: [comment],
            relatedResources: [{
                uri: `${performanceName}.msm`,
                type: 'msm'
            }]
        })
        newMPM.setPerformanceName(performanceName)

        setMSM(newMSM)
        setMPM(newMPM)
    }

    // when the MSM or the pipeline has been modified 
    // kick-off a new transformation process
    useEffect(calculateMPM, [alignmentReady, pipeline])

    useEffect(() => {
        if (!mpm) return

        mpm.setMetadata({
            authors: [author],
            comments: [comment],
            relatedResources: [{
                uri: `${performanceName}.msm`,
                type: 'msm'
            }]
        })
        mpm.setPerformanceName(performanceName)
    }, [performanceName, author, comment])

    const physicalProgress = playbackPosition * (alignedPerformance.rawPerformance?.totalDuration() || 0)

    const calculateSymbolicPlaybackPosition = () => {
        const perf = alignedPerformance.rawPerformance
        if (!perf) return 0

        const nearestMidiNote = perf.nearestNote(physicalProgress)
        if (!nearestMidiNote) return 0

        const pair = alignedPerformance.getSemanticPairs().find(pair => pair.midiNote?.id === nearestMidiNote.id)
        if (!pair || !pair.scoreNote) return 0

        return Mei.qstampToTstamp(pair.scoreNote.qstamp)
    }

    const symbolicPlaybackPosition = calculateSymbolicPlaybackPosition()

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
                <Player midi={midi} onProgress={(progress) => setPlaybackPosition(progress)} />)
                : <span>failed loading MIDI</span>}

            {msm && (
                <div className='msm'>
                    <svg className='msm' width={msm.lastDate() * horizontalStretch}>
                        <MSMGrid msm={msm} horizontalStretch={horizontalStretch} />
                        <PlaybackPosition position={symbolicPlaybackPosition * horizontalStretch} />
                    </svg>
                </div>
            )}

            {mpm && (
                <div className='mpm'>
                    <svg className='mpm' height={300} width={(msm?.lastDate() || 0) * horizontalStretch}>
                        <MPMGrid mpm={mpm} horizontalStretch={horizontalStretch} />
                        <PlaybackPosition position={symbolicPlaybackPosition * horizontalStretch} />
                    </svg>
                </div>
            )}

            {midi &&
                <div className='midi'>
                    <svg className='midi' height={300} width={(msm?.lastDate() || 0) * horizontalStretch}>
                        <MIDIGrid performance={new RawPerformance(midi)} />
                        <PlaybackPosition position={physicalProgress * horizontalStretch * 60} />
                    </svg>
                </div>
            }

            <PipelineEditor
                pipeline={pipeline}
                changePipelinePreset={changePipelinePreset}
                onReady={() => {
                    setEditPipelineOpen(false)
                    calculateMPM()
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
                    calculateMPM()
                    setEditMetadataOpen(false)
                }}
                dialogOpen={editMetadataOpen} />
        </div>
    )
}

