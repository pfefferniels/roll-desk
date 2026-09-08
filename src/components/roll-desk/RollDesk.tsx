'use client'

import { AppBar, Badge, Box, Button, IconButton, Paper, Slider, Stack, Tab, Tabs, Toolbar, Typography } from "@mui/material"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { AnySymbol, Editor, Emulation, HorizontalSpan, VerticalSpan, constraintProblems, valueOf, isEdit, isPerforation, isRollFeature, isSymbol } from 'linked-rolls'
import { spotlight, spotlightWhenDrawn } from "../../helpers/spotlight"
import { announcePlayback } from "../../hooks/usePlaybackMark"
import { welteT100System, WelteT100Options } from 'linked-rolls/welte-t100'
import { Add, Clear, Create, Download, Pause, PlayArrow, Redo, Save, Settings, Undo } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { SourceStack } from "./SourceStack"
import { Canvas } from "./LayeredRolls"
import { downloadFile } from "../../helpers/downloadFile"
import { versionAsMidi, versionsAsMidiArchive } from "../../helpers/versionMidi"
import { EmulationSettingsDialog } from "./EmulationSettingsDialog"
import { ImportButton } from "./ImportButton"
import DownloadDialog from "./DownloadDialog"
import EditMetadata from "./EditMetadata"
import { VersionMenu, VersionSelection } from "./VersionMenu"
import { CopyFacsimileMenu, FacsimileSelection } from "./CopyFacsimileMenu"
import { PinchZoomProvider } from "../../hooks/usePinchZoom"
import { useLiveZoom } from "../../hooks/useLiveZoom"
import { usePinchGesture } from "../../hooks/usePinchGesture"
import { rollLength } from "../../helpers/rollLength"
import { blendAt, workingPosition } from "../../helpers/facsimileBlend"
import { ZoomSlider } from "./ZoomSlider"
import { zoomRange } from "../../helpers/zoom"
import { Welcome } from "./Welcome"
import { RollCopyDialog } from "./RollCopyDialog"
import { Stemma } from "./Stemma"
import { Arguable } from "./Arguable"
import { RollRange, SelectionContext } from "../../providers/SelectionContext"
import { EditionContext } from "../../providers/EditionContext"
import { usePiano } from "react-pianosound"
import { usePlayback } from "../../hooks/usePlayback"
import { useHotkeys } from "react-hotkeys-hook"
import { aDialogIsOpen } from "../../helpers/aDialogIsOpen"
import { VersionView } from "./VersionView"
import { CopyFacsimile } from "./CopyFacsimile"
import { ConstraintsPanel, ConstraintSummary } from "./ConstraintsPanel"

type DeskTab = 'info' | 'stemma' | 'sources' | 'problems'

interface TabPanelProps {
    children?: React.ReactNode
    tab: DeskTab
    current: DeskTab
}

const TabPanel = ({ children, tab, current }: TabPanelProps) => (
    <div
        role='tabpanel'
        hidden={current !== tab}
        id={`desk-tabpanel-${tab}`}
        aria-labelledby={`desk-tab-${tab}`}
    >
        {current === tab && <Box sx={{ p: 0.5 }}>{children}</Box>}
    </div>
)

const namedEditors = (editors: Editor[] = []) =>
    editors.map(editor => `${editor.name} (${editor.role})`).join(', ')

export type EventDimension = {
    vertical: VerticalSpan,
    horizontal: HorizontalSpan
}

export type UserSelection = (VersionSelection | FacsimileSelection)

/** How long a symbol stays marked once playback has reached it, in milliseconds. */
const playbackMark = 600

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
    /**
     * The id of an entity of the edition to open with: a version, a copy,
     * or a symbol, feature or edit, whose version or copy is shown and
     * which is then selected and marked.
     */
    show?: string
}

export const Desk = ({ show }: DeskProps) => {
    const { play, stop } = usePiano()

    const { edition, undo, redo, canUndo, canRedo, view, viewOnly } = useContext(EditionContext)

    const initialStretch = viewOnly ? 0.2 : 1
    const stretch = useLiveZoom(initialStretch, zoomRange)
    usePinchGesture(stretch.viewport, { onPinch: stretch.scrubBy, onEnd: stretch.settle })

    const length = useMemo(() => edition ? rollLength(edition) : 0, [edition])
    const problems = useMemo(() => view ? constraintProblems(view) : [], [view])

    const [editMetadata, setEditMetadata] = useState(!viewOnly)
    const [editCopy, setEditCopy] = useState(false)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection[]>([])
    const [range, setRange] = useState<RollRange>()
    const { isPlaying, started, stopped } = usePlayback()

    const [currentCopyId, setCurrentCopyId] = useState<string>()
    const [currentVersionId, setCurrentVersionId] = useState<string>()
    const [blendPosition, setBlendPosition] = useState(workingPosition)

    const [emulationOptions, setEmulationOptions] = useState<WelteT100Options>()

    const [currentTab, setCurrentTab] = useState<DeskTab>('info')

    const hasProblems = problems.length > 0

    // The problems tab goes with the last problem, taking the choice of it along.
    if (!hasProblems && currentTab === 'problems') setCurrentTab('info')

    const currentVersion = edition?.versions.find(v => v.id === currentVersionId)
    const currentCopy = edition?.copies.find(c => c.id === currentCopyId)

    const [soleSelected] = selection.length === 1 ? selection : []
    const selectedPerforation = soleSelected && 'id' in soleSelected
        ? view?.get<AnySymbol>(soleSelected.id)
        : undefined

    const shown = useRef<string | undefined>(undefined)
    const [pendingSpotlight, setPendingSpotlight] = useState<string>()

    // A link to an entity opens the version or copy it belongs to and marks it.
    useEffect(() => {
        if (!show || !view || !edition || shown.current === show) return
        const path = view.getPath(show)
        if (!path) return
        shown.current = show

        const [collection, index] = path
        if (collection === 'versions') {
            setCurrentVersionId(edition.versions[index as number]?.id)
            setCurrentCopyId(undefined)
        }
        else if (collection === 'copies') {
            setCurrentCopyId(edition.copies[index as number]?.id)
            setCurrentVersionId(undefined)
        }
        else return

        const entity = view.get<object>(show)
        if (entity && path.length > 2 && (isSymbol(entity) || isRollFeature(entity) || isEdit(entity))) {
            setSelection([entity as UserSelection])
            setPendingSpotlight(show)
        }
    }, [show, view, edition])

    useEffect(() => {
        if (!pendingSpotlight) return
        return spotlightWhenDrawn(pendingSpotlight, () => setPendingSpotlight(undefined))
    }, [pendingSpotlight, currentVersionId, currentCopyId])

    useHotkeys(['space'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'space': {
                playVersion()
                break
            }
        }
    }, { ignoreEventWhen: aDialogIsOpen })

    // Dialogs, menus and popovers swallow Escape themselves, so this only
    // reaches the desk when nothing is open over it.
    useHotkeys('escape', () => setSelection([]))

    const playVersion = () => {
        if (!currentVersion || !view) return

        if (isPlaying) {
            stop()
            stopped()
            return
        }

        const emulation = new Emulation(welteT100System, emulationOptions)
        emulation.emulateVersion(currentVersion, view, { range, skipToFirstNote: true })

        const schedule = play(emulation.asMIDI(), (e) => {
            if (e.type !== 'meta' || e.subtype !== 'text') return

            announcePlayback(e.text, playbackMark)
            spotlight(e.text, playbackMark)
        })
        started(schedule)
    }

    const downloadMIDI = useCallback(async () => {
        if (!currentVersion || !view) return

        downloadFile(
            `${currentVersion.siglum}.mid`,
            versionAsMidi(currentVersion, view, emulationOptions),
            'audio/midi'
        )
    }, [currentVersion, view, emulationOptions])

    const downloadAllMIDI = useCallback(async () => {
        if (!edition || !view || !edition.versions.length) return

        const archiveName = edition.title.trim().replace(/[^\w.-]+/g, '_') || 'edition'
        downloadFile(
            `${archiveName}_midi.zip`,
            versionsAsMidiArchive(edition.versions, view, emulationOptions),
            'application/zip'
        )
    }, [edition, view, emulationOptions])

    /** Opens the version a constraint holds in and marks the symbols it binds. */
    const showConstraint = (versionId: string, symbolIds: string[]) => {
        setCurrentVersionId(versionId)
        setCurrentCopyId(undefined)
        setSelection(view?.getAll<AnySymbol>(symbolIds) ?? [])
        setPendingSpotlight(symbolIds[0])
    }

    useEffect(() => {
        if (!edition) return

        // If the currently active copy was removed from the edition, clear it
        if (currentCopyId && !edition.copies.find(c => c.id === currentCopyId)) {
            setCurrentCopyId(undefined)
        }
    }, [currentCopyId, edition])

    if (!edition) {
        return (
            <Welcome />
        )
    }

    const editorLine = namedEditors(edition.creation.editors)

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
                    onClick={() => setDownloadDialogOpen(true)}
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
                <Tabs value={currentTab} onChange={(_, tab: DeskTab) => setCurrentTab(tab)}>
                    <Tab value='info' label='Info' />
                    <Tab value='stemma' label='Stemma' />
                    <Tab value='sources' label='Sources' />
                    {hasProblems && (
                        <Tab
                            value='problems'
                            label={
                                <Badge
                                    badgeContent={problems.length}
                                    color='error'
                                    sx={{ pr: 1.5 }}
                                >
                                    Problems
                                </Badge>
                            }
                        />
                    )}
                </Tabs>

                <TabPanel current={currentTab} tab='info'>
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

                        {editorLine && (
                            <>
                                <br />
                                ed. {editorLine}
                            </>
                        )}
                    </div>
                    <div style={{ float: 'right', display: viewOnly ? 'none' : 'block' }}>
                        <IconButton onClick={() => setEditMetadata(true)}>
                            <Create />
                        </IconButton>
                    </div>
                </TabPanel>

                <TabPanel current={currentTab} tab='stemma'>
                    <Stemma
                        currentVersionId={currentVersionId}
                        problems={problems}
                        onClick={(versionId) => {
                            setCurrentVersionId(versionId)
                            setCurrentCopyId(undefined)
                            setSelection([])
                        }}
                    />
                </TabPanel>

                <TabPanel current={currentTab} tab='sources'>
                    <SourceStack
                        activeId={currentCopyId}
                        onClick={(copyId) => {
                            setCurrentVersionId(undefined)
                            setCurrentCopyId(copyId)
                        }}
                    />

                    {currentCopy?.scan && (
                        <Stack direction='row' spacing={2} alignItems='center' sx={{ px: 1 }}>
                            <Typography variant='caption' color='text.secondary' noWrap sx={{ flexShrink: 0 }}>
                                Facsimile
                            </Typography>
                            <Slider
                                size='small'
                                min={0}
                                max={1}
                                step={0.05}
                                marks={[{ value: workingPosition }]}
                                value={blendPosition}
                                onChange={(_, value) => setBlendPosition(value as number)}
                                aria-label='facsimile against transcription'
                                sx={{ minWidth: '6rem' }}
                            />
                            <Typography variant='caption' color='text.secondary' noWrap sx={{ flexShrink: 0 }}>
                                Transcription
                            </Typography>
                        </Stack>
                    )}

                    {!viewOnly && (
                        <Button
                            startIcon={<Add />}
                            onClick={() => setEditCopy(true)}
                        >
                            Add Copy
                        </Button>
                    )}
                </TabPanel>

                <TabPanel current={currentTab} tab='problems'>
                    <ConstraintsPanel
                        versionId={currentVersionId}
                        problems={problems}
                        onShow={showConstraint}
                    />
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
                                {isPerforation(selectedPerforation) && currentVersionId && (
                                    <ConstraintSummary
                                        symbol={selectedPerforation}
                                        versionId={currentVersionId}
                                    />
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

            <Box overflow='scroll' ref={stretch.viewportRef} sx={{ touchAction: 'pan-x pan-y' }}>
                <PinchZoomProvider
                    zoom={stretch.committed}
                    rollLength={length}
                    setZoom={stretch.jump}
                    noteHeight={3}
                    expressionHeight={10}
                    spacing={60}
                >
                    <Canvas stageRef={stretch.stageRef}>
                        {currentVersion
                            ? (
                                <VersionView
                                    onClick={e => setSelection(prev => [...prev, e])}
                                    version={currentVersion}
                                    problems={problems}
                                    emulationOptions={emulationOptions}
                                />)
                            : currentCopy && (
                                <CopyFacsimile
                                    key={`copy_${currentCopyId}`}
                                    copy={currentCopy}
                                    active={true}
                                    color="#444"
                                    blend={blendAt(blendPosition)}
                                    onClick={e => setSelection(prev => [...prev, e])}
                                    onSelectionDone={dimension => setSelection(dimension ? [dimension] : [])}
                                />
                            )
                        }
                    </Canvas>
                </PinchZoomProvider>
            </Box>

            <ZoomSlider
                zoom={stretch.committed}
                onScrub={stretch.scrub}
                onSettle={stretch.settle}
            />

            <EmulationSettingsDialog
                open={emulationSettingsDialogOpen}
                onClose={() => {
                    setEmulationSettingsDialogOpen(false)
                }}
                onDone={setEmulationOptions}
            />

            <DownloadDialog
                open={downloadDialogOpen}
                edition={edition}
                onClose={() => setDownloadDialogOpen(false)}
                onDownloadMIDI={downloadMIDI}
                onDownloadAllMIDI={downloadAllMIDI}
                versionSiglum={currentVersion?.siglum}
                versionCount={edition.versions.length}
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
