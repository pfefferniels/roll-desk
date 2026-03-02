'use client'

import { AppBar, Box, Button, IconButton, Paper, Slider, Stack, Tab, Tabs, Toolbar } from "@mui/material"
import { useCallback, useContext, useEffect, useState } from "react"
import { Emulation, HorizontalSpan, PlaceTimeConversion, VerticalSpan, Edition } from 'linked-rolls'
import { Add, Clear, Create, Download, Pause, PlayArrow, Redo, Save, Settings, Undo } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { write } from "midifile-ts"
import { SourceStack } from "./SourceStack"
import { Canvas } from "./LayeredRolls"
import { downloadFile } from "../../helpers/downloadFile"
import { EmulationSettingsDialog } from "./EmulationSettingsDialog"
import { ImportButton } from "./ImportButton"
import DownloadDialog from "./DownloadDialog"
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
import { usePiano } from "react-pianosound"
import { useHotkeys } from "react-hotkeys-hook"
import { valueOf } from "linked-rolls/lib/Assumption"
import { VersionView } from "./VersionView"
import { CopyFacsimile } from "./CopyFacsimile"

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
            {value === index && <Box sx={{ p: 0.5 }}>{children}</Box>}
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
    versionId?: string
}

export const Desk = ({ versionId }: DeskProps) => {
    const { play, stop } = usePiano()

    const { edition, undo, redo, canUndo, canRedo, view, viewOnly } = useContext(EditionContext)

    const [stretch, setStretch] = useState(viewOnly ? 0.2 : 1)

    const [editMetadata, setEditMetadata] = useState(!viewOnly)
    const [editCopy, setEditCopy] = useState(false)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection[]>([])
    const [range, setRange] = useState<[number, number]>()
    const [isPlaying, setIsPlaying] = useState(false)

    const [currentCopyId, setCurrentCopyId] = useState<string>()
    const [currentVersionId, setCurrentVersionId] = useState<string>()

    const [conversionMethod, setConversionMethod] = useState<PlaceTimeConversion>()

    const [currentTab, setCurrentTab] = useState(0)

    const currentVersion = edition?.versions.find(v => v.id === currentVersionId)

    useHotkeys(['space'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'space': {
                playVersion()
                break
            }
        }
    })

    const playVersion = () => {
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
        emulation.emulateVersion(
            currentVersion,
            view,
            undefined,
            range,
            true
        )

        play(emulation.asMIDI(), (e) => {
            if (e.type === 'meta' && e.subtype === 'text') {
                const symbolId = e.text

                const group = document.querySelector(`#${symbolId}`)
                if (group) {
                    group.dispatchEvent(new CustomEvent('playback-event', {
                        detail: {}
                    }))
                }

                const symbol = document.querySelector(`#${symbolId} rect`)
                if (!symbol) return

                symbol.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                })

                const originalFill = symbol.getAttribute('fill') ?? window.getComputedStyle(symbol as Element).fill ?? ''
                const originalStroke = symbol.getAttribute('stroke') ?? ''
                const originalStrokeWidth = symbol.getAttribute('stroke-width') ?? ''

                symbol.setAttribute('fill', 'orange')
                symbol.setAttribute('stroke', 'orangered')
                symbol.setAttribute('stroke-width', '1.5')

                window.setTimeout(() => {
                    if (originalFill) symbol.setAttribute('fill', originalFill)
                    else symbol.removeAttribute('fill')

                    if (originalStroke) symbol.setAttribute('stroke', originalStroke)
                    else symbol.removeAttribute('stroke')

                    if (originalStrokeWidth) symbol.setAttribute('stroke-width', originalStrokeWidth)
                    else symbol.removeAttribute('stroke-width')
                }, 600)
            }
        })
        setIsPlaying(true)
    }

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
        downloadFile(`${currentVersion.siglum}.mid`, dataBuf, 'audio/midi')
    }, [currentVersion, conversionMethod])

    useEffect(() => {
        if (!edition) return

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

    const viewControl = (
        <Paper sx={{
            position: 'absolute',
            margin: 1,
            left: 1,
            backdropFilter: 'blur(17px)',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: 1
        }}>
            <Stack direction='row' spacing={1}>
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
                    onClick={playVersion}>
                    {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
            </Stack>
        </Paper>
    )

    const toolbar = (
        <AppBar
            position={viewOnly ? 'absolute' : 'static'}
            sx={{
                bgcolor: "white",
                color: 'black',
                width: viewOnly ? 'fit-content' : '100%',
                left: viewOnly ? '3rem' : 'inherit'
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
                        <Ribbon title='History' visible={!viewOnly}>
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
                            onClick={playVersion}>
                            {isPlaying ? <Pause /> : <PlayArrow />}
                        </IconButton>
                    </Ribbon>
                </RibbonGroup>
            </Toolbar>
        </AppBar>)

    return (
        <SelectionContext.Provider value={{ selection, setSelection, range, setRange }}>
            {viewOnly ? viewControl : toolbar}

            <Paper
                sx={{
                    position: 'absolute',
                    margin: 1,
                    right: 1,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.6)',
                    padding: 2
                }}
            >
                <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
                    <Tab value={0} label="Info" />
                    <Tab value={1} label="Stemma" />
                    <Tab value={2} label="Sources" />
                </Tabs>

                <TabPanel value={currentTab} index={0}>
                    <div style={{ float: 'left', padding: 8, width: 'fit-content' }}>
                        <b>{edition.title}</b>
                        <br />
                        {edition.roll.catalogueNumber}{' '}

                        <Arguable
                            path={['roll', 'recordingEvent', 'date'] as const}
                        >
                            ({new Intl.DateTimeFormat().format(
                                valueOf(edition.roll.recordingEvent.date)
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
                            setCurrentVersionId(versionId)
                            setCurrentCopyId(undefined)
                            setSelection([])
                        }}
                    />
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    <SourceStack
                        activeId={currentCopyId}
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

            {!viewOnly && (
                <Paper
                    sx={{
                        position: 'absolute',
                        margin: 1,
                        backdropFilter: 'blur(17px)',
                        background: 'rgba(255, 255, 255, 0.8)',
                        padding: 2,
                        bottom: 1,
                        maxWidth: '10rem'
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
            )}

            <Box overflow='scroll'>
                <PinchZoomProvider
                    zoom={stretch}
                    setZoom={setStretch}
                    noteHeight={3}
                    expressionHeight={10}
                    spacing={60}
                >
                    <Canvas>
                        {currentVersion
                            ? (
                                <VersionView
                                    onClick={e => setSelection(prev => [...prev, e])}
                                    version={currentVersion}
                                />)
                            : (() => {
                                const copy = edition?.copies.find(c => c.id === currentCopyId)
                                if (!copy) return null

                                return (
                                    <CopyFacsimile
                                        key={`copy_${currentCopyId}`}
                                        copy={copy}
                                        active={true}
                                        color="#444"
                                        facsimileOpacity={0}
                                        onClick={e => setSelection(prev => [...prev, e])}
                                        onChange={() => { }}
                                        onSelectionDone={dimension => setSelection([{
                                            ...dimension
                                        }])}
                                    />
                                )
                            })()
                        }
                    </Canvas>
                </PinchZoomProvider>
            </Box>

            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, marginLeft: '30%', marginRight: '30%', paddingLeft: '1rem', paddingRight: '1rem', backgroundColor: 'white' }}>
                <Slider
                    sx={{ minWidth: '20rem' }}
                    min={0.1}
                    max={2.5}
                    step={0.05}
                    value={stretch}
                    onChange={(_, newValue) => setStretch(newValue as number)}
                    marks={[
                        { value: 0.1, label: '1%' },
                        { value: 0.5, label: '50%' },
                        { value: 1, label: '100%' },
                        { value: 1.5, label: '150%' },
                        { value: 2, label: '200%' },
                        { value: 2.5, label: '250%' },
                    ]}
                />
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
                onDone={(copyId) => {
                    setCurrentCopyId(copyId)
                    setCurrentVersionId(undefined)
                    setSelection([])
                }}
            />
        </SelectionContext.Provider>
    )
}
