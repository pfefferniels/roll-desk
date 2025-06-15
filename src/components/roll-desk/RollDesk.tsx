import { Button, Divider, Grid, IconButton, Paper, Slider, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material"
import { useCallback, useEffect, useRef, useState } from "react"
import { Edition, Emulation, HorizontalSpan, Intention, isEdit, isIntention, isRollFeature, isSymbol, PlaceTimeConversion, RollCopy, Stage, VerticalSpan } from 'linked-rolls'
import { Add, AlignHorizontalCenter, ArrowDownward, ArrowUpward, CallMerge, CallSplit, Clear, ClearAll, Create, Download, EditNote, GroupWork, JoinFull, Pause, PlayArrow, PsychologyAlt, Remove, Save, Settings } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { usePiano } from "react-pianosound"
import { v4 } from "uuid"
import { write } from "midifile-ts"
import { Layer, LayerStack } from "./StackList"
import { LayeredRolls } from "./LayeredRolls"
import { downloadFile } from "../../helpers/downloadFile"
import { AddSymbolDialog } from "./AddSymbol"
import { EditAssumption } from "./EditAssumption"
import { ColorDialog } from "./ColorDialog"
import { EmulationSettingsDialog } from "./EmulationSettingsDialog"
import { ImportButton } from "./ImportButton"
import { ReportDamage } from "./ReportCondition"
import DownloadDialog from "./DownloadDialog"
import { stringToColor } from "../../helpers/stringToColor"
import CreateEdition from "./CreateEdition"
import { StageCreationDialog } from "./StageCreationDialog"
import { WithId } from "linked-rolls/lib/WithId"
import { StageMenu, StageSelection } from "./StageMenu"
import { CopyFacsimileMenu } from "./CopyFacsimileMenu"
import { active } from "d3"

export type EventDimension = {
    vertical: VerticalSpan,
    horizontal: HorizontalSpan
}

export type Selection = (StageSelection | (EventDimension & WithId))[]

/**
 * Working on piano rolls is imagined like working on a 
 * massive desk (with light from below). There are different
 * piano rolls lying on top of each other. We are working
 * with clones of these copies, since we do not want to 
 * destroy the originals when e. g. stretching them. 
 * The collation result and other editing processes are noted on 
 * a thin transparent paper roll.
 */

export const Desk = () => {
    const { play, stop } = usePiano()

    const [edition, setEdition] = useState<Edition>()

    const [stretch, setStretch] = useState(2)
    const [fixedX, setFixedX] = useState(-1)

    const [layers, setLayers] = useState<Layer[]>([])
    const [activeLayer, setActiveLayer] = useState<Layer>()

    const [createEditionDialogOpen, setCreateEditionDialogOpen] = useState(true)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<Selection>([])
    const [isPlaying, setIsPlaying] = useState(false)

    const [currentStage, setCurrentStage] = useState<Stage>()
    const [conversionMethod, setConversionMethod] = useState<PlaceTimeConversion>()

    const downloadMIDI = useCallback(async () => {
        if (!currentStage) return

        const emulation = new Emulation();

        if (conversionMethod) {
            emulation.placeTimeConversion = conversionMethod
        }

        if (emulation.midiEvents.length === 0) {
            emulation.emulateStage(currentStage);
        }

        const midiFile = emulation.asMIDI()
        const dataBuf = write(midiFile.tracks, midiFile.header.ticksPerBeat);
        downloadFile('output.mid', dataBuf, 'audio/midi')
    }, [edition, currentStage, conversionMethod])

    // keeping layers and edition up-to-date
    useEffect(() => {
        setLayers(layers => {
            if (!edition) return []

            return edition.copies.map(rollCopy => {
                const existingLayer = layers.find(layer => layer.copy === rollCopy)

                // make sure to keep existing layer settings
                if (existingLayer) return existingLayer

                return {
                    copy: rollCopy,
                    visible: true,
                    color: stringToColor(rollCopy.id),
                    opacity: 0.5,
                    facsimile: true
                }
            })
        })
    }, [edition])

    if (!edition) {
        return (
            <div>
                <div>Welcome!</div>

                <ImportButton onImport={newEdition => setEdition(newEdition)} />
            </div>
        )
    }

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12} md={12} xl={12}>
                    <RibbonGroup>
                        <Ribbon title=' '>
                            <ImportButton onImport={newEdition => setEdition(newEdition)} />
                            <IconButton size='small' onClick={() => setDownloadDialogOpen(true)}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        {(!currentStage && activeLayer) && (
                            <CopyFacsimileMenu
                                copy={activeLayer.copy}
                                edition={edition}
                                onChange={edition => setEdition({ ...edition })}
                                selection={selection.filter(item => isRollFeature(item))}
                            />
                        )}
                        {currentStage && (
                            <StageMenu
                                edition={edition}
                                onChange={edition => setEdition({ ...edition })}
                                selection={selection.filter(item => {
                                    isEdit(item) || isIntention(item) || isEdit(item)
                                })}
                            />
                        )}

                        <Ribbon title='Emulation'>
                            <IconButton
                                size='small'
                                onClick={() => setEmulationSettingsDialogOpen(true)}
                            >
                                <Settings />
                            </IconButton>
                            <IconButton
                                size='small'
                                onClick={downloadMIDI}
                            >
                                <Download />
                            </IconButton>
                            <IconButton
                                disabled={!edition || !currentStage}
                                onClick={() => {
                                    if (!currentStage) return

                                    if (isPlaying) {
                                        stop()
                                        setIsPlaying(false)
                                        return
                                    }

                                    if (edition.copies.length === 0) {
                                        console.log('No existing copies')
                                        return
                                    }

                                    const emulation = new Emulation()
                                    if (conversionMethod) {
                                        emulation.placeTimeConversion = conversionMethod
                                    }
                                    emulation.emulateStage(currentStage, undefined, true)

                                    play(emulation.asMIDI())
                                    setIsPlaying(true)
                                }}>
                                {isPlaying ? <Pause /> : <PlayArrow />}
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Zoom'>
                            <Slider
                                sx={{ minWidth: 120 }}
                                min={0.1}
                                max={2}
                                step={0.05}
                                value={stretch}
                                onChange={(_, newValue) => setStretch(newValue as number)} />
                        </Ribbon>
                    </RibbonGroup>
                </Grid>
                <Grid item xs={3}>
                    <Stack direction='column' spacing={1}>
                        <Paper sx={{ maxWidth: 360 }} elevation={0}>
                            <div style={{ float: 'left', padding: 8, width: '80%' }}>
                                <b>{edition.title}</b><br />
                                {edition.roll.catalogueNumber} ({edition.roll.recordingEvent.date})
                            </div>
                            <div style={{ float: 'right' }}>
                                <IconButton onClick={() => setCreateEditionDialogOpen(true)}>
                                    <Create />
                                </IconButton>
                            </div>
                        </Paper>

                        <Paper sx={{ maxWidth: 360 }} elevation={0}>
                            <div style={{ float: 'left', padding: 8 }}>
                                <b>{selection.length}</b> events selected
                                <br />
                                <span style={{ color: 'gray', fontSize: '8pt' }}>
                                    {selection.map(e => e.id.slice(0, 8)).join(', ')}
                                </span>
                            </div>
                            <div style={{ float: 'right' }}>
                                <IconButton onClick={() => setSelection([])}>
                                    <ClearAll />
                                </IconButton>
                            </div>
                        </Paper>

                        <LayerStack
                            stack={layers}
                            active={activeLayer}
                            onChange={stack => setLayers([...stack])}
                            onClick={(layer) => setActiveLayer(layer)}
                        />

                        <Paper>
                            {edition.questions.map(question => {
                                return (
                                    <div>{question.question}</div>
                                )
                            })}
                        </Paper>
                    </Stack>
                </Grid>
                <Grid item xs={9}>
                    <div style={{ overflow: 'scroll', width: 950 }}>
                        <LayeredRolls
                            edition={edition}
                            activeLayerId={activeLayer?.copy.id || ''}
                            stack={layers}
                            stretch={stretch}
                            selection={selection}
                            onUpdateSelection={setSelection}
                            fixedX={fixedX}
                            setFixedX={setFixedX}
                            currentStage={currentStage}
                        />
                    </div>
                </Grid>
            </Grid>

            <EmulationSettingsDialog
                open={emulationSettingsDialogOpen}
                onClose={() => {
                    setEmulationSettingsDialogOpen(false)
                }}
                edition={edition}
                onDone={(conversion) => {
                    setConversionMethod(conversion)
                }}
            />

            <DownloadDialog
                open={downloadDialogOpen}
                edition={edition}
                onClose={() => setDownloadDialogOpen(false)}
            />

            <CreateEdition
                onDone={(edition) => {
                    setEdition(edition)
                }}
                onClose={() => setCreateEditionDialogOpen(false)}
                open={createEditionDialogOpen}
                edition={edition}
            />
        </>
    )
}
