import { Button, Grid, IconButton, Paper, Slider, Stack } from "@mui/material"
import { useCallback, useState } from "react"
import { AnySymbol, asSymbols, EditionMetadata, Emulation, fillEdits, flat, HorizontalSpan, Motivation, isEdit, isMotivation, isRollFeature, isSymbol, PlaceTimeConversion, Question, Version, VerticalSpan } from 'linked-rolls'
import { Add, ClearAll, Create, Download, Pause, PlayArrow, Save, Settings } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { usePiano } from "react-pianosound"
import { write } from "midifile-ts"
import { Layer, LayerStack } from "./StackList"
import { LayeredRolls } from "./LayeredRolls"
import { downloadFile } from "../../helpers/downloadFile"
import { EmulationSettingsDialog } from "./EmulationSettingsDialog"
import { ImportButton } from "./ImportButton"
import DownloadDialog from "./DownloadDialog"
import { stringToColor } from "../../helpers/stringToColor"
import EditMetadata from "./EditMetadata"
import { VersionMenu, VersionSelection } from "./VersionMenu"
import { CopyFacsimileMenu, FacsimileSelection } from "./CopyFacsimileMenu"
import { PinchZoomProvider } from "../../hooks/usePinchZoom"
import { Welcome } from "./Welcome"
import { RollCopyDialog } from "./RollCopyDialog"
import { v4 } from "uuid"
import { Stemma } from "./Stemma"

export type EventDimension = {
    vertical: VerticalSpan,
    horizontal: HorizontalSpan
}

export type UserSelection = (VersionSelection | FacsimileSelection)

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

    const [stretch, setStretch] = useState(2)

    const [metadata, setMetadata] = useState<EditionMetadata>()
    const [versions, setVersions] = useState<Version[]>([])
    const [questions, setQuestions] = useState<Question[]>([])

    const [layers, setLayers] = useState<Layer[]>([])
    const [activeLayer, setActiveLayer] = useState<Layer>()

    const [editMetadata, setEditMetadata] = useState(true)
    const [editCopy, setEditCopy] = useState(false)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection[]>([])
    const [isPlaying, setIsPlaying] = useState(false)

    const [currentVersion, setCurrentVersion] = useState<Version>()
    const [conversionMethod, setConversionMethod] = useState<PlaceTimeConversion>()

    const downloadMIDI = useCallback(async () => {
        if (!currentVersion) return

        const emulation = new Emulation();

        if (conversionMethod) {
            emulation.placeTimeConversion = conversionMethod
        }

        if (emulation.midiEvents.length === 0) {
            emulation.emulateVersion(currentVersion);
        }

        const midiFile = emulation.asMIDI()
        const dataBuf = write(midiFile.tracks, midiFile.header.ticksPerBeat);
        downloadFile('output.mid', dataBuf, 'audio/midi')
    }, [currentVersion, conversionMethod])

    if (!metadata) {
        return (
            <Welcome onCreate={metadata => {
                setMetadata(metadata)
            }} />
        )
    }

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12} md={12} xl={12}>
                    <RibbonGroup>
                        <Ribbon title=' '>
                            <ImportButton onImport={edition => {
                                <ImportButton onImport={edition => {
                                    const { copies, versions, questions, ...metadata } = edition

                                    setMetadata(metadata)
                                    setVersions(versions)
                                    setQuestions(questions)
                                    setLayers(copies.map(copy => {
                                        return {
                                            color: stringToColor(copy.id),
                                            copy: copy,
                                            opacity: 1,
                                            facsimile: false
                                        }
                                    }))
                                }} />
                                setLayers(edition.copies.map(copy => {
                                    return {
                                        color: stringToColor(copy.id),
                                        copy: copy,
                                        opacity: 1,
                                        facsimile: false
                                    }
                                }))
                            }} />
                            <IconButton size='small' onClick={() => setDownloadDialogOpen(true)}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        {(!currentVersion && activeLayer) && (
                            <CopyFacsimileMenu
                                copy={activeLayer.copy}
                                versions={versions}
                                onChange={(copy, versions) => {
                                    const layer = layers.find(layer => layer.copy === copy)
                                    if (layer) {
                                        layer.copy = copy
                                        setLayers([...layers])
                                    }
                                    if (versions) {
                                        setVersions([...versions])
                                    }
                                }}
                                onChangeSelection={selection => setSelection(selection)}
                                selection={selection.filter(item => isRollFeature(item))}
                                copies={layers.map(layer => layer.copy)}
                            />
                        )}
                        {currentVersion && (
                            <VersionMenu
                                version={currentVersion}
                                versions={versions}
                                onChange={version => {
                                    const index = versions.indexOf(version)
                                    if (index !== -1) {
                                        versions[index] = version
                                        setVersions([...versions])
                                    }
                                    setSelection([])
                                }}
                                onAdd={(version) => {
                                    versions.push(version)
                                    setVersions([...versions])
                                }}
                                onRemove={(version) => {
                                    const index = versions.indexOf(version)
                                    if (index !== -1) {
                                        versions.splice(index, 1)
                                        setVersions([...versions])
                                    }
                                }}
                                selection={selection.filter(item => {
                                    return isEdit(item) || isMotivation(item) || isSymbol(item)
                                }) as (AnySymbol | Motivation<any> | Version)[]}
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
                                disabled={!currentVersion}
                                onClick={() => {
                                    if (!currentVersion) return

                                    if (isPlaying) {
                                        stop()
                                        setIsPlaying(false)
                                        return
                                    }

                                    const emulation = new Emulation()
                                    if (conversionMethod) {
                                        emulation.placeTimeConversion = conversionMethod
                                    }
                                    emulation.emulateVersion(currentVersion, undefined, true)

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
                                <b>{metadata.title}</b><br />
                                {metadata.roll.catalogueNumber} ({flat(metadata.roll.recordingEvent.date).toISOString()})
                            </div>
                            <div style={{ float: 'right' }}>
                                <IconButton onClick={() => setEditMetadata(true)}>
                                    <Create />
                                </IconButton>
                            </div>
                        </Paper>

                        <Paper sx={{ maxWidth: 360 }} elevation={0}>
                            <div style={{ float: 'left', padding: 8 }}>
                                <b>{selection.length}</b> events selected
                                {selection.length < 10 && (
                                    <>
                                        <br />
                                        <span style={{ color: 'gray', fontSize: '8pt' }}>
                                            {selection.map(e => {
                                                if ('id' in e) {
                                                    return (e.id as any).slice(0, 15)
                                                }
                                                else {
                                                    return '[unnamed]'
                                                }
                                            }).join(', ')}
                                        </span>

                                    </>
                                )}
                            </div>
                            <div style={{ float: 'right' }}>
                                <IconButton onClick={() => setSelection([])}>
                                    <ClearAll />
                                </IconButton>
                            </div>
                        </Paper>

                        <Stemma
                            versions={versions}
                            currentVersion={currentVersion}
                            onClick={(version) => {
                                setCurrentVersion(version)
                                setActiveLayer(undefined)
                                setSelection([])
                            }}
                        />

                        <LayerStack
                            stack={layers}
                            active={activeLayer}
                            onChange={stack => setLayers([...stack])}
                            onClick={(layer) => {
                                setCurrentVersion(undefined)
                                setActiveLayer(layer)
                            }}
                        />

                        <Button
                            startIcon={<Add />}
                            onClick={() => setEditCopy(true)}
                        >
                            Add Copy
                        </Button>

                        <Paper>
                            {questions.map(question => {
                                return (
                                    <div>{question.question}</div>
                                )
                            })}
                        </Paper>
                    </Stack>
                </Grid>
                <Grid item xs={9}>
                    <div style={{ overflow: 'scroll', width: 950 }}>
                        <PinchZoomProvider zoom={stretch} noteHeight={3} expressionHeight={10}>
                            <LayeredRolls
                                active={activeLayer}
                                stack={layers}
                                selection={selection}
                                onChangeSelection={setSelection}
                                currentVersion={currentVersion}
                            />
                        </PinchZoomProvider>
                    </div>
                </Grid>
            </Grid>

            <EmulationSettingsDialog
                open={emulationSettingsDialogOpen}
                onClose={() => {
                    setEmulationSettingsDialogOpen(false)
                }}
                onDone={(conversion) => {
                    setConversionMethod(conversion)
                }}
            />

            <DownloadDialog
                open={downloadDialogOpen}
                edition={{
                    ...metadata,
                    copies: layers.map(({ copy }) => copy),
                    versions,
                    questions
                }}
                onClose={() => setDownloadDialogOpen(false)}
            />

            <EditMetadata
                onDone={(edition) => {
                    setMetadata(edition)
                }}
                onClose={() => setEditMetadata(false)}
                open={editMetadata}
                metadata={metadata}
            />

            <RollCopyDialog
                open={editCopy}
                onClose={() => setEditCopy(false)}
                onDone={(newCopy, siglum) => {
                    layers.push({
                        copy: newCopy,
                        color: stringToColor(newCopy.id),
                        opacity: 1,
                        facsimile: false
                    })

                    const newVersion: Version = {
                        siglum,
                        id: v4(),
                        edits: [],
                        motivations: [],
                        type: 'edition'
                    }

                    fillEdits(newVersion, asSymbols(newCopy.features))
                    versions.push(newVersion)
                    setVersions([...versions])
                }}
                onRemove={copy => {
                    setLayers(prev => {
                        return prev.filter(layer => layer.copy !== copy)
                    })
                }}
            />
        </>
    )
}
