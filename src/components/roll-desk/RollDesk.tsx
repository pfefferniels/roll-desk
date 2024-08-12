import { Box, Button, Grid, IconButton, Paper, Slider, Stack } from "@mui/material"
import { useCallback, useState } from "react"
import { Emulation, RollCopy, asXML, collateRolls } from 'linked-rolls'
import { RollCopyDialog } from "./RollCopyDialog"
import type { CollatedEvent, Assumption, AnyRollEvent, Relation } from "linked-rolls/lib/types.d.ts"
import { isRollEvent, isCollatedEvent } from "linked-rolls"
import { Add, AlignHorizontalCenter, CallMerge, Pause, PlayArrow, Save, Undo } from "@mui/icons-material"
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
import { insertReadings } from "linked-rolls/lib/Collator"
import { combineRelations } from "./combineRelations"

export interface CollationResult {
    events: CollatedEvent[]
}

export type UserSelection = (AnyRollEvent | CollatedEvent | Assumption)[]

export interface LayerInfo {
    id: 'working-paper' | string,
    title: string,
    visible: boolean,
    color: string
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

    const [copies, setCopies] = useState<RollCopy[]>([])
    const [collatedEvents, setCollatedEvents] = useState<CollatedEvent[]>([])
    const [assumptions, setAssumptions] = useState<Assumption[]>([])
    const [stretch, setStretch] = useState(2)
    const [fixedX, setFixedX] = useState(-1)

    const [layers, setLayers] = useState<LayerInfo[]>([{
        id: 'working-paper',
        title: 'Working Paper',
        visible: true,
        color: 'blue'
    }])
    const [activeLayerId, setActiveLayerId] = useState<string>('working-paper')

    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState(false)
    const [unifyDialogOpen, setUnifyDialogOpen] = useState(false)
    const [separateDialogOpen, setSeparateDialogOpen] = useState(false)
    const [assignHandDialogOpen, setAssignHandDialogOpen] = useState(false)
    const [addHandDialogOpen, setAddHandDialogOpen] = useState(false)

    const [selection, setSelection] = useState<UserSelection>([])
    const [isPlaying, setIsPlaying] = useState(false)

    const downloadXML = useCallback(async () => {
        const xml = asXML(copies, collatedEvents, assumptions)
        if (!xml.length) return

        const blob = new Blob([xml], { type: 'application/xml' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob);
        a.download = 'roll.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }, [assumptions, collatedEvents, copies])

    const downloadMIDI = useCallback(async () => {
        const emulation = new Emulation();
        if (emulation.midiEvents.length === 0) {
            setMessage('Running emulation');
            emulation.emulateFromCollatedRoll(collatedEvents, assumptions, copies[0]);
        }

        console.log(emulation.midiEvents)

        const midiFile = emulation.asMIDI()
        const dataBuf = write(midiFile.tracks, midiFile.header.ticksPerBeat);
        const blob = new Blob([dataBuf], { type: 'audio/midi' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'output.mid';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }, [collatedEvents, setMessage, assumptions, copies])

    const handleAlign = useCallback(() => {
        if (selection.length !== 4 &&
            !selection.every(pin => isCollatedEvent(pin) || isRollEvent(pin))
        ) {
            return
        }

        const copy = copies.find(copy => copy.physicalItem.id === activeLayerId)
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
                const sum = event.wasCollatedFrom.reduce((acc, curr) => acc + curr.hasDimension.from, 0)
                return sum / event.wasCollatedFrom.length
            }
            return event.hasDimension.from
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

        setCopies([...copies])
        setSelection([])
    }, [activeLayerId, copies, selection])

    const pushAssumption = useCallback((assumption: Assumption) => {
        setAssumptions(prev => [...prev, assumption])
    }, [])

    const currentCopy = copies.find(copy => copy.physicalItem.id === activeLayerId)

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12} md={12} xl={12}>
                    <RibbonGroup>
                        <Ribbon title=' '>
                            <IconButton
                                onClick={downloadXML}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Collation'>
                            <IconButton onClick={() => {
                                const modifiedRolls = [...copies]
                                const copy = modifiedRolls.find(copy => copy.physicalItem.id === activeLayerId)
                                if (!copy) return
                                copy.undoOperations()
                                setCopies(modifiedRolls)
                            }}>
                                <Undo />
                            </IconButton>
                            <IconButton
                                disabled={selection.length !== 4}
                                onClick={handleAlign}>
                                <AlignHorizontalCenter />
                            </IconButton>
                            <IconButton onClick={async () => {
                                const collatedEvents = await collateRolls(
                                    copies,
                                    assumptions
                                )
                                setCollatedEvents(collatedEvents)
                                insertReadings(copies, collatedEvents, assumptions)
                            }}>
                                <CallMerge />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Conjectures'>
                            <Button onClick={() => setUnifyDialogOpen(true)}>
                                Unify
                            </Button>
                            <Button onClick={() => setSeparateDialogOpen(true)}>
                                Separate
                            </Button>
                        </Ribbon>
                        <Ribbon title='Hands'>
                            <Button onClick={() => setAddHandDialogOpen(true)}>
                                Add Hand
                            </Button>
                            <Button onClick={() => setAssignHandDialogOpen(true)}>
                                Assign Hand
                            </Button>
                        </Ribbon>
                        <Ribbon title='Editorial Actions'>
                            <Button onClick={() => {
                                combineRelations(
                                    copies,
                                    selection.filter(s => 'type' in s && s.type === 'relation') as Relation[],
                                    assumptions
                                )

                                // clear the selection
                                setSelection([])
                            }}>
                                Combine
                            </Button>
                            <Button>
                                Annotate
                            </Button>
                        </Ribbon>
                        <Ribbon title='Emulation'>
                            <Button>
                                Adjust Settings
                            </Button>
                            <Button onClick={downloadMIDI}>
                                Download MIDI
                            </Button>
                            <IconButton
                                disabled={collatedEvents.length === 0}
                                onClick={() => {
                                    if (isPlaying) {
                                        stop()
                                        setIsPlaying(false)
                                        return
                                    }

                                    const emulation = new Emulation()
                                    emulation.emulateFromCollatedRoll(
                                        collatedEvents,
                                        assumptions,
                                        copies[0]
                                    )

                                    play(emulation.asMIDI())
                                    setIsPlaying(true)
                                }}>
                                {isPlaying ? <Pause /> : <PlayArrow />}
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Zoom'>
                            <Slider
                                sx={{ minWidth: 200 }}
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
                                copies={copies}
                                activeLayerId={activeLayerId}
                                setActiveLayerId={setActiveLayerId}
                            />
                            <Box>
                                <IconButton onClick={() => setRollCopyDialogOpen(true)}>
                                    <Add />
                                </IconButton>
                            </Box>
                        </Paper>

                        <Paper sx={{ maxWidth: 360 }}>
                            <ActionList
                                actions={assumptions}
                                removeAction={(action) => {
                                    setAssumptions(prev => {
                                        const index = prev.findIndex(a => a.id === action.id)
                                        if (index === -1) return prev
                                        prev.splice(index, 1)
                                        return [...prev]
                                    })
                                }} />
                        </Paper>
                    </Stack>
                </Grid>
                <Grid item xs={9}>
                    <div style={{ overflow: 'scroll', width: 950 }}>
                        <LayeredRolls
                            copies={copies}
                            assumptions={assumptions}
                            activeLayerId={activeLayerId}
                            stack={layers}
                            collationResult={{ events: collatedEvents }}
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
                    setCopies(copies => [...copies, rollCopy])
                    layers.push({
                        id: rollCopy.physicalItem.id,
                        title: `${rollCopy.physicalItem.catalogueNumber} (${rollCopy.physicalItem.rollDate})`,
                        visible: true,
                        color: stringToColour(rollCopy.physicalItem.id)
                    })
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
                />)}

            {currentCopy && (
                <AddHandDialog
                    open={addHandDialogOpen}
                    onDone={(editing) => {
                        setAddHandDialogOpen(false)
                    }}
                    copy={currentCopy}
                />)}
        </>
    )
}
