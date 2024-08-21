import { Box, Button, Grid, IconButton, Paper, Slider, Stack } from "@mui/material"
import { useCallback, useState } from "react"
import { Edition, Emulation, asXML } from 'linked-rolls'
import { RollCopyDialog } from "./RollCopyDialog"
import type { CollatedEvent, Assumption, AnyRollEvent, Relation, EventDimension } from "linked-rolls/lib/types.d.ts"
import { isRollEvent, isCollatedEvent } from "linked-rolls"
import { Add, AlignHorizontalCenter, CallMerge, CallSplit, Delete, Download, EditNote, FileOpen, GroupWork, JoinFull, Pause, PlayArrow, Remove, Save, Settings, Undo } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { usePiano } from "react-pianosound"
import { v4 } from "uuid"
import { useSnackbar } from "../../providers/SnackbarContext"
import { write } from "midifile-ts"
import { UnifyDialog } from "./UnifyDialog"
import { SeparateDialog } from "./SeparateDialog"
import { StackList } from "./StackList"
import { ActionList } from "./ActionList"
import { AssignHand } from "./AssignHand"
import { AddHandDialog } from "./AddHand"
import { LayeredRolls } from "./LayeredRolls"
import { combineRelations } from "linked-rolls"
import { downloadFile } from "../../helpers/downloadFile"
import { AddEventDialog } from "./AddEvent"
import { AddNote } from "./AddNote"
import { ColorDialog } from "./ColorDialog"
import { EmulationSettingsDialog } from "./EmulationSettingsDialog"

export interface CollationResult {
    events: CollatedEvent[]
}

export type UserSelection = (AnyRollEvent | CollatedEvent | Assumption | EventDimension)[]

export interface LayerInfo {
    id: 'working-paper' | string,
    title: string,
    visible: boolean,
    color: string
    facsimileOpacity: number
}

export const stringToColour = (str: string) => {
    let hash = 0;
    str.split('').forEach(char => {
        hash = char.charCodeAt(0) + ((hash << 5) - hash)
    })
    let colour = '#'
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff
        colour += value.toString(16).padStart(2, '0')
    }
    return colour
}

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
    const { setMessage } = useSnackbar()
    const { play, stop } = usePiano()

    const [edition, setEdition] = useState<Edition>(new Edition())
    // const [copies, setCopies] = useState<RollCopy[]>([])
    // const [collatedEvents, setCollatedEvents] = useState<CollatedEvent[]>([])
    // const [assumptions, setAssumptions] = useState<Assumption[]>([])

    const [stretch, setStretch] = useState(2)
    const [fixedX, setFixedX] = useState(-1)

    const [layers, setLayers] = useState<LayerInfo[]>([{
        id: 'working-paper',
        title: 'Working Paper',
        visible: true,
        color: 'blue',
        facsimileOpacity: 0
    }])
    const [activeLayerId, setActiveLayerId] = useState<string>('working-paper')

    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState(false)
    const [unifyDialogOpen, setUnifyDialogOpen] = useState(false)
    const [separateDialogOpen, setSeparateDialogOpen] = useState(false)
    const [assignHandDialogOpen, setAssignHandDialogOpen] = useState(false)
    const [addHandDialogOpen, setAddHandDialogOpen] = useState(false)
    const [addEventDialogOpen, setAddEventDialogOpen] = useState(false)
    const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false)
    const [colorToChange, setColorToChange] = useState<LayerInfo>()
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection>([])
    const [isPlaying, setIsPlaying] = useState(false)

    const [primarySource, setPrimarySource] = useState('')

    const downloadXML = useCallback(async () => {
        const xml = asXML(edition.copies, edition.collationResult.events, edition.assumptions)
        if (!xml.length) return
        downloadFile('roll.xml', xml, 'application/xml')
    }, [edition])

    const downloadMIDI = useCallback(async () => {
        if (edition.copies.length === 0) return

        const primary = edition.copies.find(copy => copy.id === primarySource)
        const emulation = new Emulation();
        if (emulation.midiEvents.length === 0) {
            emulation.emulateFromEdition(edition, primary || edition.copies[0]);
        }

        const midiFile = emulation.asMIDI()
        const dataBuf = write(midiFile.tracks, midiFile.header.ticksPerBeat);
        downloadFile('output.mid', dataBuf, 'audio/midi')
    }, [edition, primarySource])

    const handleAlign = useCallback(() => {
        if (selection.length !== 4 &&
            !selection.every(pin => isCollatedEvent(pin) || isRollEvent(pin))
        ) {
            return
        }

        const copy = edition.copies.find(copy => copy.physicalItem.id === activeLayerId)
        if (!copy) {
            console.log('No active copy selected')
            return
        }

        const eventsInActiveLayer: AnyRollEvent[] = []
        const otherNotes = []
        for (const pin of (selection as (AnyRollEvent | CollatedEvent)[])) {
            if (copy.events.findIndex(event => event.id === pin.id) !== -1 && !('wasCollatedFrom' in pin)) {
                eventsInActiveLayer.push(pin)
            }
            else {
                otherNotes.push(pin)
            }
        }

        if (eventsInActiveLayer.length !== 2 || otherNotes.length !== 2) {
            console.log('You have to select exactly 2 + 2 events')
            return
        }

        const from = (event: AnyRollEvent | CollatedEvent) => {
            if ('wasCollatedFrom' in event) {
                const sum = event.wasCollatedFrom.reduce((acc, curr) => acc + curr.hasDimension.horizontal.from, 0)
                return sum / event.wasCollatedFrom.length
            }
            return event.hasDimension.horizontal.from
        }

        const point1 = [
            from(otherNotes[0]),
            from(eventsInActiveLayer[0])
        ]

        const point2 = [
            from(otherNotes[1]),
            from(eventsInActiveLayer[1])
        ]

        const stretch = (point2[0] - point1[0]) / (point2[1] - point1[1])
        const shift = point1[0] - stretch * point1[1]

        if (!copy) return

        copy.applyOperations([
            {
                id: v4(),
                type: 'stretching',
                factor: stretch
            },
            {
                id: v4(),
                type: 'shifting',
                vertical: 0,
                horizontal: shift
            }
        ])

        setEdition(edition.shallowClone())
        setSelection([])
    }, [activeLayerId, edition, selection])

    const pushAssumption = useCallback((assumption: Assumption) => {
        setEdition(prev => {
            const clone = prev.shallowClone()
            clone.assumptions.push(assumption)
            return clone
        })
    }, [])

    const currentCopy = edition.copies.find(copy => copy.physicalItem.id === activeLayerId)

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12} md={12} xl={12}>
                    <RibbonGroup>
                        <Ribbon title=' '>
                            <IconButton size='small' onClick={() => { }}>
                                <FileOpen />
                            </IconButton>
                            <IconButton size='small' onClick={downloadXML}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Collation'>
                            <IconButton size='small' onClick={() => {
                                const copy = edition.copies.find(copy => copy.physicalItem.id === activeLayerId)
                                if (!copy) return
                                copy.undoOperations()
                                setEdition(edition.shallowClone())
                            }}>
                                <Undo />
                            </IconButton>
                            <Button
                                size='small'
                                disabled={selection.length !== 4}
                                onClick={handleAlign}
                                startIcon={<AlignHorizontalCenter />}
                            >
                                Adjust
                            </Button>
                            <Button
                                size='small'
                                onClick={() => {
                                    edition.collateCopies(true)
                                    setEdition(edition.shallowClone())
                                }}
                                startIcon={<CallMerge />}
                                disabled={edition.copies.length === 0}
                            >
                                Collate
                            </Button>
                        </Ribbon>
                        <Ribbon title='Roll Events'>
                            <IconButton
                                size='small'
                                onClick={() => setAddEventDialogOpen(true)}
                            >
                                <Add />
                            </IconButton>
                            <IconButton
                                size='small'
                            >
                                <Remove />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Conjectures'>
                            <Button
                                size='small'
                                onClick={() => setUnifyDialogOpen(true)}
                                startIcon={<JoinFull />}
                                disabled={edition.copies.length === 0}
                            >
                                Unify
                            </Button>
                            <Button
                                size='small'
                                onClick={() => setSeparateDialogOpen(true)}
                                startIcon={<CallSplit />}
                                disabled={edition.copies.length === 0}
                            >
                                Separate
                            </Button>
                        </Ribbon>
                        <Ribbon title='Hands'>
                            <Button
                                size='small'
                                disabled={currentCopy === undefined}
                                onClick={() => setAddHandDialogOpen(true)}
                                startIcon={<Add />}
                            >
                                Add Hand
                            </Button>
                            <Button
                                size='small'
                                disabled={selection.findIndex(selection => isRollEvent(selection)) === -1}
                                onClick={() => setAssignHandDialogOpen(true)}>
                                Assign Hand
                            </Button>
                        </Ribbon>
                        <Ribbon title='Editorial Actions'>
                            <Button
                                size='small'
                                onClick={() => {
                                    combineRelations(
                                        edition.copies,
                                        selection.filter(s => 'type' in s && s.type === 'relation') as Relation[],
                                        edition.assumptions
                                    )

                                    setEdition(edition.shallowClone())
                                    setSelection([])
                                }}
                                startIcon={<GroupWork />}
                                disabled={activeLayerId !== 'working-paper'}
                            >
                                Group Readings
                            </Button>
                            <Button
                                size='small'
                                onClick={() => setAddNoteDialogOpen(true)}
                                startIcon={<EditNote />}
                                disabled={activeLayerId !== 'working-paper'}
                            >
                                Add Note
                            </Button>
                        </Ribbon>
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
                                disabled={edition.collationResult.events.length === 0}
                                onClick={() => {
                                    if (isPlaying) {
                                        stop()
                                        setIsPlaying(false)
                                        return
                                    }

                                    const emulation = new Emulation()
                                    emulation.emulateFromEdition(
                                        edition,
                                        edition.copies[0]
                                    )

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
                        <Paper sx={{ maxWidth: 360 }}>
                            <StackList
                                stack={layers}
                                setStack={setLayers}
                                copies={edition.copies}
                                activeLayerId={activeLayerId}
                                setActiveLayerId={setActiveLayerId}
                                onChangeColor={(item) => setColorToChange(item)}
                            />
                            <Box>
                                <IconButton onClick={() => setRollCopyDialogOpen(true)}>
                                    <Add />
                                </IconButton>
                            </Box>
                        </Paper>

                        <Paper sx={{ maxWidth: 360 }}>
                            <div style={{ float: 'left', padding: 8 }}>
                                <b>{selection.length}</b> events selected
                            </div>
                            <div style={{ float: 'right' }}>
                                <IconButton onClick={() => setSelection([])}>
                                    <Delete />
                                </IconButton>
                            </div>
                        </Paper>

                        {edition.assumptions.length > 0 && (
                            <Paper sx={{ maxWidth: 360, maxHeight: 380, overflow: 'scroll' }}>
                                <ActionList
                                    actions={edition.assumptions}
                                    removeAction={(action) => {
                                        edition.assumptions.slice(
                                            edition.assumptions.indexOf(action),
                                            1
                                        )
                                        setEdition(edition.shallowClone())
                                    }} />
                            </Paper>
                        )}
                    </Stack>
                </Grid>
                <Grid item xs={9}>
                    <div style={{ overflow: 'scroll', width: 950 }}>
                        <LayeredRolls
                            edition={edition}
                            activeLayerId={activeLayerId}
                            stack={layers}
                            stretch={stretch}
                            selection={selection}
                            onUpdateSelection={setSelection}
                            fixedX={fixedX}
                            setFixedX={setFixedX}
                        />
                    </div>
                </Grid>
            </Grid>

            <RollCopyDialog
                open={rollCopyDialogOpen}
                onClose={() => setRollCopyDialogOpen(false)}
                onDone={rollCopy => {
                    edition.copies.push(rollCopy)
                    layers.push({
                        id: rollCopy.physicalItem.id,
                        title: `${rollCopy.physicalItem.catalogueNumber} (${rollCopy.physicalItem.rollDate})`,
                        visible: true,
                        color: stringToColour(rollCopy.physicalItem.id),
                        facsimileOpacity: 0
                    })
                    setEdition(edition.shallowClone())
                }} />

            {
                selection.length === 1 && isRollEvent(selection[0]) && (
                    <SeparateDialog
                        open={separateDialogOpen}
                        onClose={() => setSeparateDialogOpen(false)}
                        selection={selection[0] as AnyRollEvent}
                        clearSelection={() => setSelection([])}
                        breakPoint={fixedX}
                        onDone={pushAssumption}
                    />
                )
            }

            <UnifyDialog
                open={unifyDialogOpen}
                selection={selection.filter(pin => isRollEvent(pin)) as AnyRollEvent[]}
                clearSelection={() => setSelection([])}
                onDone={pushAssumption}
                onClose={() => setUnifyDialogOpen(false)} />

            {currentCopy && (
                <AssignHand
                    open={assignHandDialogOpen}
                    onDone={(assignment) => {
                        if (assignment) {
                            pushAssumption(assignment)
                        }
                        setAssignHandDialogOpen(false)
                    }}
                    copy={currentCopy}
                    clearSelection={() => setSelection([])}
                    selection={selection.filter(pin => isRollEvent(pin)) as AnyRollEvent[]}
                />)
            }

            {currentCopy && (
                <AddHandDialog
                    open={addHandDialogOpen}
                    onDone={(editing) => {
                        setAddHandDialogOpen(false)
                    }}
                    copy={currentCopy}
                />)
            }

            {currentCopy && (
                <AddEventDialog
                    open={addEventDialogOpen}
                    selection={selection.find(selection => 'horizontal' in selection) as EventDimension}
                    onDone={(newEvent) => {
                        currentCopy.events.push(newEvent)

                        // TODO: add measurement
                        setAddEventDialogOpen(false)
                    }}
                    onClose={() => setAddEventDialogOpen(false)}
                />)
            }

            {selection.length >= 1 && (
                <AddNote
                    open={addNoteDialogOpen}
                    onDone={(updatedAssumptions) => {
                        for (const assumption of updatedAssumptions) {
                            const index = edition.assumptions.findIndex(a => a.id === assumption.id)
                            if (index === -1) continue
                            edition.assumptions.splice(index, 1, assumption)
                        }
                        setEdition(edition.shallowClone())
                        setAddNoteDialogOpen(false)
                        setSelection([])
                    }}
                    selection={selection.filter(e => 'type' in e && e.type === 'relation')}
                />)
            }

            {colorToChange && (
                <ColorDialog
                    open={colorToChange !== undefined}
                    onClose={() => setColorToChange(undefined)}
                    onSave={(newLayerInfo) => {
                        const index = layers.findIndex(l => l.id === newLayerInfo.id)
                        if (index === -1) return
                        layers.splice(index, 1, newLayerInfo)
                        console.log('updating layers')
                        setLayers([...layers])
                    }}
                    layerInfo={colorToChange}
                />)
            }

            {
                <EmulationSettingsDialog
                    open={emulationSettingsDialogOpen}
                    onClose={() => {
                        setEmulationSettingsDialogOpen(false)
                    }}
                    edition={edition}
                    onDone={(primaryCopy) => setPrimarySource(primaryCopy)}
                />
            }
        </>
    )
}
