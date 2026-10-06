'use client'

import { AppBar, Badge, Box, Button, IconButton, Paper, Slider, Stack, Tab, Tabs, Toolbar, Tooltip, Typography } from "@mui/material"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { HorizontalSpan, VerticalSpan, barOf, carriageProblems, constraintProblems, milliseconds, mm, trackerBarOf, isCommand, welteT100, symbolIn, symbolsIn, TrackRole } from 'linked-rolls'
import { useLocation, useNavigate } from "react-router-dom"
import { onsetToMiddleOf, spotlight, spotlightWhenDrawn } from "./spotlight"
import { deskPath, entityOfPath, idNamed, idOfMark, linkTarget, LinkTarget, titlePath } from "../edition/addresses"
import { OpenContext } from "./OpenContext"
import { useSnackbar } from "./SnackbarContext"
import { Cite } from "./Cite"
import { About } from "./About"
import { Svg, svg, svgPerMm } from "../canvas/units"
import { LaneHeights, lanesOf } from "../canvas/rollGeometry"
import { announcePlayback } from "../playback/usePlaybackMark"
import { emulationOf, EmulationOptions } from '../playback/reproducingSystems'
import { Add, ChevronLeft, ChevronRight, Clear, Download, Home, PlayArrow, Redo, Save, Settings, Stop, Undo } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { ToolButton } from "./ToolButton"
import { headingOf, pageTitleOf } from "./pageTitle"
import { unseen } from "./unseen"
import { SourceStack } from "../sources/SourceStack"
import { Canvas } from "../canvas/LayeredRolls"
import { downloadFile } from "./downloadFile"
import { versionAsMidi, versionsAsMidiArchive } from "../playback/versionMidi"
import { versionLabel } from "../edition/names"
import { EmulationSettingsDialog } from "../playback/EmulationSettingsDialog"
import { ImportButton } from "./ImportButton"
import DownloadDialog from "./DownloadDialog"
import EditMetadata, { MetadataJob } from "./EditMetadata"
import { VersionMenu, VersionSelection } from "../version/VersionMenu"
import { CopyFacsimileMenu, FacsimileSelection } from "../copy/CopyFacsimileMenu"
import { PinchZoomProvider } from "../canvas/usePinchZoom"
import { useLiveZoom } from "../canvas/useLiveZoom"
import { usePinchGesture } from "../canvas/usePinchGesture"
import { rollLength } from "../canvas/rollLength"
import { blendAt, workingPosition } from "../facsimile/facsimileBlend"
import { zoomRange } from "../canvas/zoom"
import { Welcome } from "./Welcome"
import { TitlePage } from "./TitlePage"
import { RollCopyDialog } from "../copy/RollCopyDialog"
import { Stemma } from "../stemma/Stemma"
import { AccountPanel, TabColumn } from "../accounts/Account"
import { VersionAccount } from "../accounts/VersionAccount"
import { CopyAccountDialog } from "../accounts/CopyAccountDialog"
import { RollRange, SelectionContext } from "./SelectionContext"
import { EditionContext, emptyEdition } from "../edition/EditionContext"
import { usePiano } from "react-pianosound"
import { usePlayback } from "../playback/usePlayback"
import { useHotkeys } from "react-hotkeys-hook"
import { goesToAnOverlay } from "./goesToAnOverlay"
import { activatesItsTarget } from "./activatesItsTarget"
import { VersionView } from "../version/VersionView"
import { dynamicsRoom } from "../version/Dynamics"
import { compassOf } from "../version/compass"
import { CopyFacsimile } from "../facsimile/CopyFacsimile"
import { ConstraintsPanel, ConstraintSummary } from "../constraints/ConstraintsPanel"
import { isHeldMotivation } from "../edition/motivation"

type DeskTab = 'stemma' | 'sources' | 'problems'

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

/** What ties a tab to its panel, which takes its name from the tab. */
const tabOf = (tab: DeskTab) => ({
    id: `desk-tab-${tab}`,
    'aria-controls': `desk-tabpanel-${tab}`
})

/** Where the panel of tabs sits, over the desk at the top right corner. */
const deskPanel = {
    position: 'absolute',
    margin: 1,
    right: 1,
    backdropFilter: 'blur(10px)',
    background: 'rgba(255, 255, 255, 0.6)'
} as const

/**
 * How the bar is laid out for a version: it is read for its expression,
 * so the keyboard is pressed together and cut to the notes the piece
 * plays, and the dynamics it yields stand beyond the bar on either side.
 * The reader may drag each block taller or shorter, starting from these
 * lanes.
 */
const versionLayout = {
    spacing: svg(16),
    room: { above: dynamicsRoom, below: dynamicsRoom }
}

const versionLanes = lanesOf(svg(3), svg(10))

/** How the bar is laid out for a copy, whose lanes are read against its scan. */
const copyLayout = {
    lanes: lanesOf(svg(3), svg(10)),
    spacing: svg(60)
}

export type EventDimension = {
    vertical: VerticalSpan,
    horizontal: HorizontalSpan
}

export type UserSelection = (VersionSelection | FacsimileSelection)

/** How long a symbol stays marked once playback has reached it. */
const playbackMark = milliseconds(600)

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
    const { play } = usePiano()
    const { setMessage } = useSnackbar()
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const { edition, setEdition, undo, redo, canUndo, canRedo, viewOnly } = useContext(EditionContext)

    const initialStretch = svgPerMm(viewOnly ? 0.2 : 1)
    const {
        committed: stretchZoom, gesturing, stageRef,
        viewportRef, viewport, scrubBy, settle, jump
    } = useLiveZoom(initialStretch, zoomRange)
    usePinchGesture(viewport, { onPinch: scrubBy, onEnd: settle })

    const length = useMemo(() => edition ? rollLength(edition) : mm(0), [edition])
    const compass = useMemo(() => edition ? compassOf(edition) : undefined, [edition])
    const problems = useMemo(() => edition ? constraintProblems(edition) : [], [edition])
    const carriage = useMemo(() => edition ? carriageProblems(edition) : [], [edition])

    const [metadataJob, setMetadataJob] = useState<MetadataJob>()
    const [editCopy, setEditCopy] = useState(false)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection[]>([])
    const [range, setRange] = useState<RollRange>()

    const [currentCopyId, setCurrentCopyId] = useState<string>()
    const [currentVersionId, setCurrentVersionId] = useState<string>()
    /** The copy whose account is being read, which is shown apart from the desk. */
    const [accountCopyId, setAccountCopyId] = useState<string>()
    const [blendPosition, setBlendPosition] = useState(workingPosition)
    /** The lanes a version is drawn in, as the reader has dragged its blocks; kept from one version to the next. */
    const [lanes, setLanes] = useState<LaneHeights>(versionLanes)
    const resizeLane = useCallback((role: TrackRole, lane: Svg) => setLanes(lanes => ({ ...lanes, [role]: lane })), [])

    // The desk shows a version or a copy, never both.
    const { isPlaying, started, stop } = usePlayback(currentVersionId ?? currentCopyId)

    const [emulationOptions, setEmulationOptions] = useState<EmulationOptions>()

    const [currentTab, setCurrentTab] = useState<DeskTab>('stemma')
    /** The panel folds away where the roll under it is what matters. */
    const [panelOpen, setPanelOpen] = useState(true)

    /**
     * Whether the panel was just folded away or brought back. The button
     * pressed for it goes with it, so the focus is handed to the one that
     * undoes it rather than left to the page.
     */
    const panelToggled = useRef(false)
    const togglePanel = (open: boolean) => {
        panelToggled.current = true
        setPanelOpen(open)
    }
    const takesFocusFromToggle = useCallback((button: HTMLButtonElement | null) => {
        if (!button || !panelToggled.current) return
        panelToggled.current = false
        button.focus()
    }, [])

    /** Where the title page is drawn. */
    const titlePageRef = useRef<HTMLElement>(null)

    const troubles = problems.length + carriage.length
    const hasProblems = troubles > 0

    // The problems tab goes with the last problem, taking the choice of it along.
    if (!hasProblems && currentTab === 'problems') setCurrentTab('stemma')

    const currentVersion = edition?.versions.find(v => v.id === currentVersionId)
    const currentCopy = edition?.copies.find(c => c.id === currentCopyId)

    // The desk draws whatever is open by the bar it was read with.
    const deskBar = (currentVersion
        ? trackerBarOf(currentVersion.system)
        : currentCopy && barOf(currentCopy)) ?? welteT100

    const [soleSelected] = selection.length === 1 ? selection : []
    const selectedCommand = soleSelected && 'id' in soleSelected
        ? edition && symbolIn(edition, soleSelected.id)
        : undefined

    /** The entity the desk has taken its address from, so that neither side of the address repeats the other's work. */
    const shown = useRef<string | undefined>(undefined)
    const [pendingSpotlight, setPendingSpotlight] = useState<string>()

    /** Takes what lies on the desk off it, which leaves the title page. */
    const clearDesk = useCallback(() => {
        setCurrentVersionId(undefined)
        setCurrentCopyId(undefined)
        setSelection([])
    }, [])

    /** Opens what the entity lies on and marks it, or says that the edition holds nothing under the id. */
    const open = useCallback((id: string): LinkTarget | undefined => {
        if (!edition) return undefined

        const target = linkTarget(edition, id)
        if (!target) {
            setMessage(`The edition of WM 225 holds nothing under the identifier ${id}.`)
            return undefined
        }

        if (target.on === 'version') {
            setCurrentVersionId(target.versionId)
            setCurrentCopyId(undefined)
        }
        else if (target.on === 'copy') {
            setCurrentCopyId(target.copyId)
            setCurrentVersionId(undefined)
        }
        else {
            // Nothing that lies on the roll: a statement of the edition
            // about itself, which is read on its title page.
            clearDesk()
        }

        const mark = 'mark' in target ? target.mark : undefined
        if (mark) {
            setSelection([mark])
            setPendingSpotlight(idOfMark(mark))
        }
        return target
    }, [edition, setMessage, clearDesk])

    // A link to an entity opens what it lies on and marks it.
    useEffect(() => {
        if (!edition || shown.current === show) return
        shown.current = show
        // A short address names the entity by the start of its id.
        if (show) open(idNamed(edition, show) ?? show)
    }, [show, edition, open])

    /** Opens what an account refers to, and turns to the tab it is read in. */
    const openFromAccount = useCallback((id: string) => {
        const target = open(id)
        if (target?.on === 'version') setCurrentTab('stemma')
        if (target?.on === 'copy') setCurrentTab('sources')
    }, [open])

    /**
     * Turns to the title page. The published desk gives it its own address,
     * since an empty desk leaves the address as it was. The button pressed
     * for it is disabled there, so the focus goes on to the title. It is
     * let go of first: a button disabled under the focus loses it without
     * a word, and its tooltip, which went by the focus, would stay open.
     */
    const showTitlePage = (button: HTMLElement) => {
        button.blur()
        clearDesk()
        if (viewOnly) void navigate(titlePath, { replace: true })
        requestAnimationFrame(() => titlePageRef.current?.querySelector<HTMLElement>('h1')?.focus())
    }

    const shownPath = edition && deskPath(edition, { versionId: currentVersionId, copyId: currentCopyId, selection })

    const heading = edition && headingOf(edition, { versionId: currentVersionId, copyId: currentCopyId })

    useEffect(() => {
        document.title = pageTitleOf(edition, heading)
    }, [edition, heading])

    // The published desk keeps its address on what is shown, so that a
    // reader can pass on or cite whatever they are looking at. The editor
    // works on an edition that is not published and has no addresses.
    useEffect(() => {
        if (!viewOnly || shown.current !== show || !shownPath || shownPath === pathname) return

        shown.current = entityOfPath(shownPath)
        void navigate(shownPath, { replace: true })
    }, [viewOnly, show, shownPath, pathname, navigate])

    useEffect(() => {
        if (!pendingSpotlight) return
        return spotlightWhenDrawn(pendingSpotlight, () => setPendingSpotlight(undefined))
    }, [pendingSpotlight, currentVersionId, currentCopyId])

    const playVersion = () => {
        if (!currentVersion || !edition) return

        if (isPlaying) {
            stop()
            return
        }

        const emulation = emulationOf(currentVersion.system, emulationOptions)
        if (!emulation) return

        emulation.emulateVersion(currentVersion, edition, { range, skipToFirstNote: true })

        // The view follows where the roll is being read, not the middle of what sounds.
        const follow = viewport ? onsetToMiddleOf(viewport) : undefined
        const schedule = play(emulation.asMIDI(), (e) => {
            if (e.type !== 'meta' || e.subtype !== 'text') return

            announcePlayback(e.text, playbackMark)
            spotlight(e.text, playbackMark, follow)
        })
        started(schedule)
    }

    useHotkeys(['space'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'space': {
                playVersion()
                break
            }
        }
    }, {
        ignoreEventWhen: event => goesToAnOverlay(event) || activatesItsTarget(event)
    })

    // Dialogs, menus and popovers swallow Escape themselves, so this only
    // reaches the desk when nothing is open over it.
    useHotkeys('escape', () => setSelection([]))

    const downloadMIDI = useCallback(() => {
        if (!currentVersion || !edition) return

        const midi = versionAsMidi(currentVersion, edition, emulationOptions)
        if (!midi) return

        downloadFile(`${versionLabel(edition, currentVersion.id).replace(/[^\w.-]+/g, '_')}.mid`, midi, 'audio/midi')
    }, [currentVersion, edition, emulationOptions])

    const downloadAllMIDI = useCallback(() => {
        if (!edition || !edition || !edition.versions.length) return

        const archiveName = edition.title.trim().replace(/[^\w.-]+/g, '_') || 'edition'
        downloadFile(
            `${archiveName}_midi.zip`,
            versionsAsMidiArchive(edition.versions, edition, emulationOptions),
            'application/zip'
        )
    }, [edition, emulationOptions])

    /** Opens the version a constraint holds in and marks the symbols it binds. */
    const showConstraint = (versionId: string, symbolIds: string[]) => {
        setCurrentVersionId(versionId)
        setCurrentCopyId(undefined)
        setSelection(edition ? symbolsIn(edition, symbolIds) : [])
        setPendingSpotlight(symbolIds[0])
    }

    useEffect(() => {
        if (!edition) return

        // If the currently active copy was removed from the edition, clear it
        if (currentCopyId && !edition.copies.find(c => c.id === currentCopyId)) {
            setCurrentCopyId(undefined)
        }
    }, [currentCopyId, edition])

    /** Puts an unnamed edition on the desk and asks for the name it goes by. */
    const createEdition = () => {
        setEdition(emptyEdition())
        setMetadataJob('create')
    }

    if (!edition) {
        return (
            <Welcome onCreate={createEdition} />
        )
    }

    const shownEntity = shownPath && entityOfPath(shownPath)

    const onTitlePage = !currentVersion && !currentCopy

    const playButton = (
        <ToolButton
            label={isPlaying ? 'Stop' : 'Play'}
            hint={currentVersion ? `${isPlaying ? 'Stop' : 'Play'} (Space)` : 'Open a version to play it'}
            aria-keyshortcuts='Space'
            disabled={!currentVersion}
            onClick={playVersion}
        >
            {isPlaying ? <Stop /> : <PlayArrow />}
        </ToolButton>
    )

    const emulationSettingsButton = (
        <ToolButton
            label='Emulation settings'
            size='small'
            onClick={() => setEmulationSettingsDialogOpen(true)}
        >
            <Settings />
        </ToolButton>
    )

    const viewControl = (
        <Paper component='header' sx={{
            position: 'absolute',
            margin: 1,
            left: 1,
            backdropFilter: 'blur(17px)',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: 1
        }}>
            <Stack direction='row' spacing={1}>
                <Cite entity={shownEntity} />
                {emulationSettingsButton}
                <ToolButton
                    label='Download'
                    size='small'
                    onClick={() => setDownloadDialogOpen(true)}
                >
                    <Download />
                </ToolButton>
                {playButton}
                <About />
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
                        <ToolButton label='Save' hint='Save, as a download' size='small' onClick={() => setDownloadDialogOpen(true)}>
                            <Save />
                        </ToolButton>
                    </Ribbon>
                    <RibbonGroup>
                        <Ribbon title='History' visible={!viewOnly}>
                            <ToolButton
                                label='Undo'
                                onClick={() => undo()}
                                disabled={!canUndo}
                            >
                                <Undo />
                            </ToolButton>
                            <ToolButton
                                label='Redo'
                                onClick={() => redo()}
                                disabled={!canRedo}
                            >
                                <Redo />
                            </ToolButton>
                        </Ribbon>
                    </RibbonGroup>
                    {(!viewOnly && !currentVersion && currentCopyId) && (
                        <CopyFacsimileMenu copyId={currentCopyId} />
                    )}
                    {(!viewOnly && currentVersionId) && (
                        <VersionMenu versionId={currentVersionId} />
                    )}

                    <Ribbon title='Emulation'>
                        {emulationSettingsButton}
                        <ToolButton
                            label='Download the MIDI file'
                            hint={currentVersion ? undefined : 'Open a version to download its MIDI file'}
                            size='small'
                            disabled={!currentVersion}
                            onClick={downloadMIDI}
                        >
                            <Download />
                        </ToolButton>
                        {playButton}
                    </Ribbon>
                </RibbonGroup>
                <Box sx={{ ml: 'auto' }}>
                    <About />
                </Box>
            </Toolbar>
        </AppBar>)

    return (
        <SelectionContext.Provider value={{ selection, setSelection, range, setRange }}>
        <OpenContext.Provider value={openFromAccount}>
            {viewOnly ? viewControl : toolbar}

            {!panelOpen && (
                <Paper component='aside' aria-label='Panel' sx={{ ...deskPanel, padding: 0.5 }}>
                    <Tooltip title='Show the panel'>
                        <IconButton
                            ref={takesFocusFromToggle}
                            size='small'
                            aria-label='Show the panel'
                            onClick={() => togglePanel(true)}
                        >
                            <ChevronLeft />
                        </IconButton>
                    </Tooltip>
                </Paper>
            )}

            {panelOpen && (
                <Paper component='aside' aria-label='Panel' sx={{ ...deskPanel, padding: 2 }}>
                    <Stack direction='row' alignItems='center'>
                        <Tooltip title={onTitlePage ? 'On the title page' : 'Back to the title page'}>
                            <span>
                                <IconButton
                                    size='small'
                                    disabled={onTitlePage}
                                    aria-label='Back to the title page'
                                    onClick={event => showTitlePage(event.currentTarget)}
                                >
                                    <Home />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tabs
                            value={currentTab}
                            onChange={(_, tab: DeskTab) => setCurrentTab(tab)}
                            sx={{ flexGrow: 1 }}
                        >
                            <Tab value='stemma' label='Stemma' {...tabOf('stemma')} />
                            <Tab value='sources' label='Sources' {...tabOf('sources')} />
                            {hasProblems && (
                                <Tab
                                    value='problems'
                                    {...tabOf('problems')}
                                    label={
                                        <Badge
                                            badgeContent={troubles}
                                            color='error'
                                            sx={{ pr: 1.5 }}
                                        >
                                            Problems
                                        </Badge>
                                    }
                                />
                            )}
                        </Tabs>

                        <Tooltip title='Fold the panel away'>
                            <IconButton
                                ref={takesFocusFromToggle}
                                size='small'
                                aria-label='Fold the panel away'
                                onClick={() => togglePanel(false)}
                            >
                                <ChevronRight />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <TabPanel current={currentTab} tab='stemma'>
                        <TabColumn>
                            <Stemma
                                currentVersionId={currentVersionId}
                                problems={problems}
                                height={currentVersion ? 380 : 600}
                                onClick={(versionId) => {
                                    setCurrentVersionId(versionId)
                                    setCurrentCopyId(undefined)
                                    setSelection([])
                                }}
                            />
                            {currentVersion && (
                                <AccountPanel>
                                    <VersionAccount versionId={currentVersion.id} />
                                </AccountPanel>
                            )}
                            {currentCopy && (
                                <Typography variant='caption' color='text.secondary' sx={{ mt: 1, width: 300 }}>
                                    A copy is open. What is known of it is under Sources, behind its info button.
                                </Typography>
                            )}
                        </TabColumn>
                    </TabPanel>

                    <TabPanel current={currentTab} tab='sources'>
                        <TabColumn>
                        <Box sx={{ minHeight: 0, overflow: 'auto' }}>
                            <SourceStack
                                activeId={currentCopyId}
                                onClick={(copyId) => {
                                    setCurrentVersionId(undefined)
                                    setCurrentCopyId(copyId)
                                }}
                                onShowAccount={setAccountCopyId}
                            />
                        </Box>

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
                                    onChange={(_, value) => setBlendPosition(value)}
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
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Add Copy
                            </Button>
                        )}
                        </TabColumn>
                    </TabPanel>

                    <TabPanel current={currentTab} tab='problems'>
                        <ConstraintsPanel
                            versionId={currentVersionId}
                            problems={problems}
                            carriage={carriage}
                            onShow={showConstraint}
                        />
                    </TabPanel>
                </Paper>
            )}

            {!viewOnly && (
                <Paper
                    component='aside'
                    aria-label='Selection'
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
                                                if (isHeldMotivation(e)) {
                                                    return e.motivation.id.slice(0, 15)
                                                }
                                                else if ('id' in e) {
                                                    return e.id.slice(0, 15)
                                                }
                                                else {
                                                    return '[unnamed]'
                                                }
                                            }).join(', ')}
                                        </span>

                                    </>
                                )}
                                {isCommand(selectedCommand) && currentVersionId && (
                                    <ConstraintSummary
                                        symbol={selectedCommand}
                                        versionId={currentVersionId}
                                    />
                                )}
                            </div>
                            <div style={{ float: 'right' }}>
                                <Cite entity={shownEntity} />
                                <ToolButton
                                    label='Clear the selection'
                                    hint='Clear the selection (Escape)'
                                    aria-keyshortcuts='Escape'
                                    onClick={() => setSelection([])}
                                >
                                    <Clear />
                                </ToolButton>
                            </div>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Says what has been laid on the desk, as the eye sees it on the roll. */}
            <Box role='status' sx={unseen}>{heading}</Box>

            {onTitlePage && (
                <Box component='main' ref={titlePageRef}>
                    <TitlePage onEdit={viewOnly ? undefined : () => setMetadataJob('edit')} />
                </Box>
            )}

            {!onTitlePage && (
                <Box component='main' overflow='scroll' ref={viewportRef} sx={{ touchAction: 'pan-x pan-y' }}>
                    <Box component='h1' sx={unseen}>{heading}</Box>
                    <PinchZoomProvider
                        bar={deskBar}
                        zoom={stretchZoom}
                        rollLength={length}
                        setZoom={jump}
                        viewport={viewport}
                        gesturing={gesturing}
                        {...(currentVersion ? { ...versionLayout, lanes, compass } : copyLayout)}
                    >
                        <Canvas stageRef={stageRef}>
                            {currentVersion
                                ? (
                                    <VersionView
                                        onClick={e => setSelection(prev => [...prev, e])}
                                        version={currentVersion}
                                        problems={problems}
                                        emulationOptions={emulationOptions}
                                        onResizeLane={resizeLane}
                                        playing={isPlaying}
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
            )}

            <EmulationSettingsDialog
                open={emulationSettingsDialogOpen}
                system={currentVersion?.system}
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
                versionSiglum={currentVersion && edition ? versionLabel(edition, currentVersion.id) : undefined}
                versionCount={edition.versions.length}
            />

            {accountCopyId && (
                <CopyAccountDialog
                    copyId={accountCopyId}
                    onClose={() => setAccountCopyId(undefined)}
                />
            )}

            {metadataJob && (
                <EditMetadata
                    job={metadataJob}
                    onClose={() => setMetadataJob(undefined)}
                />
            )}

            <RollCopyDialog
                open={editCopy}
                onClose={() => setEditCopy(false)}
                onDone={(copyId) => {
                    setCurrentCopyId(copyId)
                    setCurrentVersionId(undefined)
                    setSelection([])
                }}
            />
        </OpenContext.Provider>
        </SelectionContext.Provider>
    )
}
