import { Box, Button, Grid, IconButton, Paper, Slider, Stack } from "@mui/material"
import { useCallback, useEffect, useRef, useState } from "react"
import { Emulation, RollCopy, asXML, collateRolls } from 'linked-rolls'
import { RollCopyDialog } from "./RollCopyDialog"
import type { CollatedEvent, Note, Expression, Assumption, AnyRollEvent } from "linked-rolls/lib/types.d.ts"
import { isCollatedEvent } from "linked-rolls"
import { RollCopyViewer } from "./RollCopyViewer"
import { Add, AlignHorizontalCenter, CallMerge, Pause, PlayArrow, Save, Undo } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { WorkingPaper } from "./WorkingPaper"
import { usePiano } from "react-pianosound"
import { RollGrid } from "./RollGrid"
import { Selection } from "./Selection"
import { Glow } from "./Glow"
import { PinchZoomProvider } from "../../hooks/usePinchZoom"
import { v4 } from "uuid"
import { useSnackbar } from "../../providers/SnackbarContext"
import { write } from "midifile-ts"
import { Relate } from "./Relate"
import { UnifyDialog } from "./UnifyDialog"
import { Cursor } from "./Cursor"
import { SeparateDialog } from "./SeparateDialog"
import { StackList } from "./StackList"
import { ActionList } from "./ActionList"
import { AssignHand } from "./AssignHand"
import { AddHandDialog } from "./AddHand"

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

    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState(false)
    const [lemmatizeDialogOpen, setRelateDialogOpen] = useState(false)
    const [unifyDialogOpen, setUnifyDialogOpen] = useState(false)
    const [separateDialogOpen, setSeparateDialogOpen] = useState(false)
    const [assignHandDialogOpen, setAssignHandDialogOpen] = useState(false)
    const [addHandDialogOpen, setAddHandDialogOpen] = useState(false)

    const [stack, setStack] = useState<LayerInfo[]>([{
        id: 'working-paper',
        title: 'Working Paper',
        visible: true,
        color: 'blue'
    }])
    const [activeLayerId, setActiveLayerId] = useState<string>('working-paper')

    const [pins, setPins] = useState<(AnyRollEvent | CollatedEvent)[]>([])

    const [isDragging, setIsDragging] = useState(false)
    const [shiftX, setShiftX] = useState(0)
    const [stretch, setStretch] = useState(2)
    const [cursorX, setCursorX] = useState(-1)
    const [fixedX, setFixedX] = useState(-1)

    const [isPlaying, setIsPlaying] = useState(false)

    const svgRef = useRef<SVGGElement>(null)

    // makes sure that the active layer comes last
    let orderedLayers = [...stack].reverse()
    const activeLayer = stack.find(layer => layer.id === activeLayerId)
    if (activeLayer) {
        orderedLayers.splice(stack.indexOf(activeLayer), 1)
        orderedLayers.push(activeLayer)
    }

    const downloadXML = useCallback(async () => {
        const xmlDoc = asXML(copies, collatedEvents, assumptions)
        if (!xmlDoc) return

        const xml = new XMLSerializer().serializeToString(xmlDoc)
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
        if (pins.length !== 4) return

        const copy = copies.find(copy => copy.physicalItem.id === activeLayerId)
        if (!copy) {
            console.log('No active copy selected')
            return
        }

        const eventsInActiveLayer: AnyRollEvent[] = []
        const otherNotes = []
        for (const pin of pins) {
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
        setPins([])
    }, [activeLayerId, copies, pins])

    const onDragStart = useCallback(() => {
        setIsDragging(true)
    }, [])

    const onDragEnd = useCallback(() => {
        setIsDragging(false)
    }, [])

    const onMouseMove = useCallback((event: MouseEvent) => {
        if (!event.target) return

        if (isDragging) {
            if (!isDragging) return
            setShiftX(prev => prev + event.movementX)
        }
        else {
            const rect = (event.target as Element).getBoundingClientRect();
            const x = event.clientX - rect.left;
            setCursorX((x - shiftX) / stretch)
        }
    }, [shiftX, stretch, isDragging])

    useEffect(() => {
        const svg = svgRef.current
        if (!svg) return

        svg.addEventListener('mousedown', onDragStart)
        svg.addEventListener('mousemove', onMouseMove)
        svg.addEventListener('mouseup', onDragEnd)

        return () => {
            svg.removeEventListener('mousemove', onMouseMove)
            svg.removeEventListener('mousedown', onDragStart)
            svg.removeEventListener('mouseup', onDragEnd)
        }
    }, [onDragEnd, onDragStart, onMouseMove])

    const pushAssumption = useCallback((assumption: Assumption) => {
        setAssumptions(prev => [...prev, assumption])
    }, [])

    const importXML = useCallback(() => {
        // TODO
    }, [])

    const currentCopy = pins.length &&
        copies.find(copy => copy.events.findIndex(event => event.id === pins[0].id) !== -1)

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
                                disabled={pins.length !== 4}
                                onClick={handleAlign}>
                                <AlignHorizontalCenter />
                            </IconButton>
                            <IconButton onClick={async () => {
                                setCollatedEvents(await collateRolls(
                                    copies,
                                    assumptions
                                ))
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
                            <Button onClick={() => setRelateDialogOpen(true)}>
                                Relate
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
                                stack={stack}
                                setStack={setStack}
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
                </Grid >
                <Grid item xs={9}>
                    <Paper>
                        <svg width="1000" height={6 * 100}>
                            <Glow />
                            <g transform={/*`translate(${shiftX}, 0) scale(${stretch}, 1)`*/''} ref={svgRef}>
                                <PinchZoomProvider pinch={shiftX} zoom={stretch} trackHeight={6}>
                                    <RollGrid width={10000} />
                                    <Cursor
                                        onFix={() => setFixedX(cursorX)}
                                        x={cursorX} />
                                    <Cursor
                                        fixed={true}
                                        x={fixedX} />

                                    {orderedLayers
                                        .map((stackItem, i) => {
                                            if (!stackItem.visible) return null

                                            if (stackItem.id === 'working-paper') {
                                                return (
                                                    <WorkingPaper
                                                        key={`copy_${i}`}
                                                        numberOfRolls={copies.length}
                                                        events={collatedEvents}
                                                        assumptions={assumptions}
                                                        copies={copies}
                                                        onClick={(event: CollatedEvent) => {
                                                            const existingPin = pins.indexOf(event)
                                                            if (existingPin !== -1) {
                                                                console.log('removing existing pin', existingPin)
                                                                setPins(prev => {
                                                                    prev.splice(existingPin, 1)
                                                                    return [...prev]
                                                                })
                                                            }
                                                            else {
                                                                setPins(prev => [...prev, event])
                                                            }
                                                        }} />
                                                )
                                            }

                                            const copy = copies.find(copy => copy.physicalItem.id === stackItem.id)
                                            if (!copy) return null

                                            return (
                                                <RollCopyViewer
                                                    key={`copy_${i}`}
                                                    copy={copy}
                                                    onTop={i === 0}
                                                    color={stackItem.color}
                                                    onClick={(event) => {
                                                        setPins(prev => [...prev, event])
                                                    }} />
                                            )
                                        })}

                                    {svgRef.current && (
                                        <Selection
                                            pins={pins}
                                            remove={pinToRemove => {
                                                setPins(prev => prev.filter(pin => pin.id !== pinToRemove.id))
                                            }} />
                                    )}
                                </PinchZoomProvider>
                            </g>
                        </svg>
                    </Paper>
                </Grid>
            </Grid>

            <RollCopyDialog
                open={rollCopyDialogOpen}
                onClose={() => setRollCopyDialogOpen(false)}
                onDone={rollCopy => {
                    setCopies(copies => [...copies, rollCopy])
                    stack.push({
                        id: rollCopy.physicalItem.id,
                        title: `${rollCopy.physicalItem.catalogueNumber} (${rollCopy.physicalItem.rollDate})`,
                        visible: true,
                        color: stringToColour(rollCopy.physicalItem.id)
                    })
                }} />

            {
                pins.length === 1 && !isCollatedEvent(pins[0]) && (
                    <SeparateDialog
                        open={separateDialogOpen}
                        onClose={() => setSeparateDialogOpen(false)}
                        selection={pins[0] as AnyRollEvent}
                        clearSelection={() => setPins([])}
                        breakPoint={fixedX}
                        onDone={pushAssumption}
                    />
                )
            }

            <UnifyDialog
                open={unifyDialogOpen}
                selection={pins.filter(pin => !isCollatedEvent(pin)) as AnyRollEvent[]}
                clearSelection={() => setPins([])}
                onDone={pushAssumption}
                onClose={() => setUnifyDialogOpen(false)} />

            <Relate
                open={lemmatizeDialogOpen}
                onDone={(lemma) => {
                    pushAssumption(lemma)
                    setRelateDialogOpen(false)
                }}
                clearSelection={() => setPins([])}
                selection={pins.filter(pin => isCollatedEvent(pin)) as CollatedEvent[]} />

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
                    clearSelection={() => setPins([])}
                    selection={pins.filter(pin => !isCollatedEvent(pin)) as AnyRollEvent[]}
                />)}

            {currentCopy && (
                <AddHandDialog
                    open={addHandDialogOpen}
                    onDone={(editing) => {
                        console.log('added', editing)
                        setAddHandDialogOpen(false)
                    }}
                    copy={currentCopy}
                />)}
        </>
    )
}
