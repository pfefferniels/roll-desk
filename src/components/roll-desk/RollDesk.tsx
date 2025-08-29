'use client'

import { AppBar, Box, Button, IconButton, Paper, Slider, Tab, Tabs, Toolbar } from "@mui/material"
import { useCallback, useContext, useEffect, useState } from "react"
import { AnySymbol, asSymbols, Emulation, fillEdits, flat, HorizontalSpan, Motivation, isEdit, isMotivation, isRollFeature, isSymbol, PlaceTimeConversion, Version, VerticalSpan, Edition } from 'linked-rolls'
import { Add, Clear, Create, Download, Pause, PlayArrow, Save, Settings } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
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
import { Arguable } from "./Arguable"
import { SelectionContext } from "../../providers/SelectionContext"
import { Draft } from 'immer'
import { EditionContext } from "../../providers/EditionContext"

export type DocOp = (d: Draft<Edition>) => void;

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

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

interface DeskProps {
    viewOnly?: boolean
    versionId?: string
}

export const Desk = ({ viewOnly, versionId }: DeskProps) => {
    // const { play, stop } = usePiano()

    const { edition, apply } = useContext(EditionContext)

    const [stretch, setStretch] = useState(2)

    const [layers, setLayers] = useState<Layer[]>([])
    const [activeLayer, setActiveLayer] = useState<Layer>()

    const [editMetadata, setEditMetadata] = useState(!viewOnly)
    const [editCopy, setEditCopy] = useState(false)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection[]>([])
    const [isPlaying, setIsPlaying] = useState(false)

    const [currentVersion, setCurrentVersion] = useState<Version>()
    const [currentMotivation, setCurrentMotivation] = useState<Motivation<string>>()

    const [conversionMethod, setConversionMethod] = useState<PlaceTimeConversion>()

    const [currentTab, setCurrentTab] = useState(2)

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

    const importEdition = (edition: Edition) => {
        const { copies } = edition

        setLayers(copies.map(copy => {
            return {
                color: stringToColor(copy.id),
                copy: copy,
                symbolOpacity: 1,
                facsimileOpacity: 0,
                facsimile: false
            }
        }))
    }

    useEffect(() => {
        if (edition) importEdition(edition)
    }, [edition])

    useEffect(() => {
        if (!versionId) return
        setCurrentVersion(edition?.versions.find(v => v.id === versionId))
    }, [versionId, edition])

    if (!edition) {
        return (
            <Welcome />
        )
    }

    return (
        <SelectionContext.Provider value={{ selection, setSelection }}>
            <AppBar
                position={viewOnly ? 'absolute' : 'static'}
                sx={{
                    bgcolor: "white",
                    color: 'black',
                    width: viewOnly ? 'fit-content' : '100%',
                    right: viewOnly ? '3rem' : 'inherit'
                }}
                elevation={1}
            >
                <Toolbar>
                    <RibbonGroup>
                        <Ribbon title='File' visible={!viewOnly}>
                            <ImportButton />
                            <IconButton size='small' onClick={() => setDownloadDialogOpen(true)}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        {(!viewOnly && !currentVersion && activeLayer) && (
                            <CopyFacsimileMenu
                                copy={activeLayer.copy}
                                onChange={(copy) => {
                                    const layer = layers.find(layer => layer.copy === copy)
                                    if (layer) {
                                        layer.copy = copy
                                        setLayers([...layers])
                                    }
                                }}
                                onChangeSelection={selection => setSelection(selection)}
                                selection={selection.filter(item => isRollFeature(item))}
                                copies={layers.map(layer => layer.copy)}
                            />
                        )}
                        {(!viewOnly && currentVersion) && (
                            <VersionMenu
                                versionId={currentVersion.id}
                                onClearSelection={() => {
                                    setSelection([])
                                }}
                                selection={selection.filter(item => {
                                    return isEdit(item)
                                        || isMotivation(item)
                                        || isSymbol(item)
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

                                    //play(emulation.asMIDI())
                                    setIsPlaying(true)
                                }}>
                                {isPlaying ? <Pause /> : <PlayArrow />}
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Zoom'>
                            <Slider
                                sx={{ minWidth: 120 }}
                                min={0.1}
                                max={3}
                                step={0.05}
                                value={stretch}
                                onChange={(_, newValue) => setStretch(newValue as number)} />
                        </Ribbon>
                    </RibbonGroup>
                </Toolbar>
            </AppBar>
            <Paper
                sx={{
                    position: 'absolute',
                    margin: 1,
                    backdropFilter: 'blur(17px)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: 2
                }}
            >
                <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
                    <Tab value={0} label="General" />
                    <Tab value={1} label="Stemma" />
                    <Tab value={2} label="Carriers" />
                </Tabs>

                <TabPanel value={currentTab} index={0}>
                    <div style={{ float: 'left', padding: 8, width: 'fit-content' }}>
                        <b>{edition.title}</b>
                        <br />
                        {edition.roll.catalogueNumber}{' '}

                        <Arguable
                            viewOnly={viewOnly || false}
                            path={['roll', 'recordingEvent', 'date'] as const}
                        >
                            ({new Intl.DateTimeFormat().format(
                                flat(edition.roll.recordingEvent.date)
                            )})
                        </Arguable>
                    </div>
                    <div style={{ float: 'right', display: viewOnly ? 'none' : 'block' }}>
                        <IconButton onClick={() => setEditMetadata(true)}>
                            <Create />
                        </IconButton>
                    </div>
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                    <Stemma
                        versions={edition.versions}
                        currentVersion={currentVersion}
                        onClick={(version) => {
                            setCurrentVersion(version)
                            setActiveLayer(undefined)
                            setSelection([])
                        }}
                        onHoverMotivation={(motivation) => {
                            if (motivation === null) {
                                setCurrentMotivation(undefined)
                            }
                            else {
                                setCurrentMotivation(motivation)
                            }
                        }}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    <LayerStack
                        stack={
                            currentVersion
                                ? layers.filter(layer => {
                                    const features = layer.copy.features.map(f => f.id)
                                    const versionFeatures = currentVersion.edits
                                        .map(edit => ([...(edit.insert || []), ...(edit.delete || [])]))
                                        .flat()
                                        .map(symbol => symbol.carriers)
                                        .flat()
                                        .map(feature => flat(feature).id)

                                    const intersection = new Set(features).intersection(new Set(versionFeatures))
                                    return intersection.size !== 0
                                })
                                : layers
                        }
                        active={activeLayer}
                        onChange={stack => setLayers([...stack])}
                        onClick={(layer) => {
                            setCurrentVersion(undefined)
                            setActiveLayer(layer)
                        }}
                    />

                    {!viewOnly && (
                        <Button
                            startIcon={<Add />}
                            onClick={() => setEditCopy(true)}
                        >
                            Add Copy
                        </Button>
                    )}
                </TabPanel>
            </Paper>

            <Paper
                sx={{
                    position: 'absolute',
                    margin: 1,
                    backdropFilter: 'blur(17px)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: 2,
                    bottom: 1
                }}
            >
                {selection.length > 0 && (
                    <Box>
                        <div style={{ float: 'left', padding: 8 }}>
                            <b>{selection.length}</b> item(s) selected
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
                                <Clear />
                            </IconButton>
                        </div>
                    </Box>
                )}
            </Paper>
            <Box overflow='scroll'>
                <PinchZoomProvider zoom={stretch} noteHeight={3} expressionHeight={10}>
                    <LayeredRolls
                        active={activeLayer}
                        stack={layers}
                        selection={selection}
                        onChangeSelection={setSelection}
                        currentVersion={currentVersion}
                        currentMotivation={currentMotivation}

                    />
                </PinchZoomProvider>
            </Box>

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
                    ...edition,
                    copies: layers.map(({ copy }) => copy),
                }}
                onClose={() => setDownloadDialogOpen(false)}
            />

            <EditMetadata
                onClose={() => setEditMetadata(false)}
                open={editMetadata}
            />

            <RollCopyDialog
                open={editCopy}
                onClose={() => setEditCopy(false)}
                onDone={(newCopy, siglum) => {
                    layers.push({
                        copy: newCopy,
                        color: stringToColor(newCopy.id),
                        symbolOpacity: 1,
                        facsimileOpacity: 0
                    })

                    const newVersion: Version = {
                        siglum,
                        id: v4(),
                        edits: [],
                        motivations: [],
                        type: 'edition'
                    }

                    fillEdits(newVersion, asSymbols(newCopy.features), { toleranceStart: 3, toleranceEnd: 3 })
                    apply(draft => draft.versions.push(newVersion))
                }}
                onRemove={copy => {
                    setLayers(prev => {
                        return prev.filter(layer => layer.copy !== copy)
                    })
                }}
            />
        </SelectionContext.Provider >
    )
}
