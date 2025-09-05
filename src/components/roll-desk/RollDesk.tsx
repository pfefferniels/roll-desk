'use client'

import { AppBar, Box, Button, IconButton, Paper, Slider, Tab, Tabs, Toolbar } from "@mui/material"
import { useCallback, useContext, useEffect, useState } from "react"
import { AnySymbol, Emulation, flat, HorizontalSpan, Motivation, isEdit, isMotivation, isRollFeature, isSymbol, PlaceTimeConversion, Version, VerticalSpan, Edition } from 'linked-rolls'
import { Add, Clear, Create, Download, Pause, PlayArrow, Redo, Save, Settings, Undo } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { write } from "midifile-ts"
import { LayerInfo, LayerStack } from "./StackList"
import { LayeredRolls } from "./LayeredRolls"
import { downloadFile } from "../../helpers/downloadFile"
import { EmulationSettingsDialog } from "./EmulationSettingsDialog"
import { ImportButton } from "./ImportButton"
import DownloadDialog from "./DownloadDialog"
import { distinctColors } from "../../helpers/distinctColors"
import EditMetadata from "./EditMetadata"
import { VersionMenu, VersionSelection } from "./VersionMenu"
import { CopyFacsimileMenu, FacsimileSelection } from "./CopyFacsimileMenu"
import { PinchZoomProvider } from "../../hooks/usePinchZoom"
import { Welcome } from "./Welcome"
import { RollCopyDialog } from "./RollCopyDialog"
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

    const { edition, undo, redo, canUndo, canRedo, view, setEdition } = useContext(EditionContext)

    const [stretch, setStretch] = useState(2)

    const [layerInfos, setLayerInfos] = useState<LayerInfo[]>([])

    const [editMetadata, setEditMetadata] = useState(!viewOnly)
    const [editCopy, setEditCopy] = useState(false)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection[]>([])
    const [isPlaying, setIsPlaying] = useState(false)

    const [currentCopyId, setCurrentCopyId] = useState<string>()
    const [currentVersionId, setCurrentVersionId] = useState<string>()
    const [currentMotivation, setCurrentMotivation] = useState<Motivation<string>>()

    const [conversionMethod, setConversionMethod] = useState<PlaceTimeConversion>()

    const [currentTab, setCurrentTab] = useState(2)

    const currentVersion = edition?.versions.find(v => v.id === currentVersionId)

    const downloadMIDI = useCallback(async () => {
        if (!currentVersion || !view) return

        const emulation = new Emulation();

        if (conversionMethod) {
            emulation.placeTimeConversion = conversionMethod
        }

        if (emulation.midiEvents.length === 0) {
            emulation.emulateVersion(currentVersion, view);
        }

        const midiFile = emulation.asMIDI()
        const dataBuf = write(midiFile.tracks, midiFile.header.ticksPerBeat);
        downloadFile('output.mid', dataBuf, 'audio/midi')
    }, [currentVersion, conversionMethod])

    useEffect(() => {
        if (!edition) return

        setLayerInfos(prev => {
            const prevMap = new Map(prev.map(li => [li.copyId, li]))

            const newList: LayerInfo[] = edition.copies.map((copy, i) => {
                const existing = prevMap.get(copy.id)
                if (existing) return existing

                return {
                    color: distinctColors[i % distinctColors.length],
                    copyId: copy.id,
                    symbolOpacity: 1,
                    facsimileOpacity: 0,
                    facsimile: false
                }
            })

            const unchanged = prev.length === newList.length && prev.every((p, i) => p.copyId === newList[i].copyId && p === newList[i])
            return unchanged ? prev : newList
        })

        // If the currently active copy was removed from the edition, clear it
        if (currentCopyId && !edition.copies.find(c => c.id === currentCopyId)) {
            setCurrentCopyId(undefined)
        }
    }, [edition?.copies])

    if (!edition) {
        return (
            <Welcome />
        )
    }

    const handleUpdateSelection = (newSelection: UserSelection[]) => {
        console.log('updating user selection', newSelection)
        setSelection(newSelection)
    }

    return (
        <SelectionContext.Provider value={{ selection, setSelection: handleUpdateSelection as any }}>
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
                        <RibbonGroup>
                            <Ribbon title='History'>
                                <IconButton
                                    onClick={() => undo()}
                                    disabled={!canUndo}
                                >
                                    <Undo />
                                </IconButton>
                                <IconButton
                                    onClick={() => redo()}
                                    disabled={!canRedo}
                                >
                                    <Redo />
                                </IconButton>
                            </Ribbon>
                        </RibbonGroup>
                        {(!viewOnly && !currentVersion && currentCopyId) && (
                            <CopyFacsimileMenu copyId={currentCopyId} />
                        )}
                        {(!viewOnly && currentVersionId) && (
                            <VersionMenu versionId={currentVersionId} />
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
                                    if (!currentVersion || !view) return

                                    if (isPlaying) {
                                        stop()
                                        setIsPlaying(false)
                                        return
                                    }

                                    const emulation = new Emulation()
                                    if (conversionMethod) {
                                        emulation.placeTimeConversion = conversionMethod
                                    }
                                    emulation.emulateVersion(currentVersion, view, undefined, true)

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
                    <Tab value={0} label="Info" />
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
                        currentVersionId={currentVersionId}
                        onClick={(versionId) => {
                            console.log('setting to', versionId)
                            setCurrentVersionId(versionId)
                            setCurrentCopyId(undefined)
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
                        layerInfos={layerInfos}
                        activeId={currentCopyId}
                        onChange={layerInfos => setLayerInfos([...layerInfos])}
                        onClick={(copyId) => {
                            setCurrentVersionId(undefined)
                            setCurrentCopyId(copyId)
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
                        activeId={currentCopyId}
                        layerInfos={layerInfos}
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
                edition={edition}
                onClose={() => setDownloadDialogOpen(false)}
            />

            <EditMetadata
                onClose={() => setEditMetadata(false)}
                open={editMetadata}
            />

            <RollCopyDialog
                open={editCopy}
                onClose={() => setEditCopy(false)}
            />
        </SelectionContext.Provider >
    )
}
