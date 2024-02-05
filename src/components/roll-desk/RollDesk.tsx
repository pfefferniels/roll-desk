import { Box, Divider, Grid, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper } from "@mui/material"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Collator, Emulation, RollCopy, createCutout } from 'linked-rolls'
import { RollCopyDialog } from "./RollCopyDialog"
import { CollatedEvent, Note, Expression, Cutout } from "linked-rolls/lib/.ldo/rollo.typings"
import { RollCopyViewer } from "./RollCopyViewer"
import { Add, AlignHorizontalCenter, ArrowUpward, CallMerge, ColorLens, ContentCut, CopyAll, MultipleStop, Pause, PlayArrow, Save, Visibility, VisibilityOff } from "@mui/icons-material"
import { OperationsAsText } from "./OperationAsText"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { WorkingPaper } from "./WorkingPaper"
import { usePiano } from "../../hooks/usePiano"
import { RollGrid } from "./RollGrid"
import { PinContainer } from "./PinContainer"
import { Glow } from "./Glow"
import { CutoutContainer } from "./CutoutContainer"
import { InterpretationDialog } from "../works/dialogs/InterpretationDialog"
import { PinchZoomProvider } from "../../hooks/usePinchZoom"

interface RollEditorProps {
    url: string
}

const stringToColour = (str: string) => {
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

export const Desk = ({ url }: RollEditorProps) => {
    const [rerender, setRerender] = useState(0)
    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState(false)
    const [interpretationDialogOpen, setInterpretationDialogOpen] = useState(false)
    const [stack, setStack] = useState<({
        id: 'working-paper' | string,
        active: boolean,
        color: string
    })[]>([{
        id: 'working-paper',
        active: true,
        color: 'blue'
    }])
    const [isDragging, setIsDragging] = useState(false)
    const [pins, setPins] = useState<(Note | Expression | CollatedEvent)[]>([])
    const [cutouts, setCutouts] = useState<Cutout[]>([])
    const [activeCutout, setActiveCutout] = useState<Cutout>()
    const [shiftX, setShiftX] = useState(0)
    const [stretch, setStretch] = useState(2)
    const [isPlaying, setIsPlaying] = useState(false)
    const { play, stopAll } = usePiano()

    const collator = useRef(new Collator())

    const svgRef = useRef<SVGGElement>(null)

    const render = () => setRerender(rerender => rerender + 1)

    const saveAll = async () => {
        const dataset = collator.current.asDataset('https://mypod.org/')
        // const emulationDataset = 
        console.log('Saving dataset', dataset, 'and emulation and', cutouts)
    }

    const handleAlign = () => {
        if (pins.length !== 4) return

        const collatedEvents = pins.filter(e => e.type?.["@id"] === 'CollatedEvent') as CollatedEvent[]
        const notes = pins.filter(e => e.type?.["@id"] === 'Note') as Note[]
        if (collatedEvents.length !== 2 || notes.length !== 2) return

        const point1 = [
            notes[0].P43HasDimension.from,
            collatedEvents[0].wasCollatedFrom!.at(0)!.P43HasDimension.from]

        const point2 = [
            notes[1].P43HasDimension.to,
            collatedEvents[1].wasCollatedFrom!.at(0)!.P43HasDimension.to
        ]

        const stretch = (point2[1] - point1[1]) / (point2[0] - point1[0])
        const shift = point1[1] - stretch * point1[0]

        const active = stack.find(item => item.active && item.id !== 'working-paper')
        if (!active) return
        const copy = collator.current.findCopy(active.id)
        if (!copy) return

        collator.current.stretchRollCopy(copy, stretch)
        collator.current.shiftRollCopy(copy, shift, 0)
        collator.current.applyOperations()
        render()
    }

    const updateStretch = useRef<ReturnType<typeof setTimeout> | null>(null)

    const onDragStart = useCallback(() => {
        setIsDragging(true)
    }, [])

    const onDrag = useCallback((e: MouseEvent) => {
        if (!isDragging) return
        setShiftX(prev => prev + e.movementX)
    }, [isDragging])

    const onDragEnd = useCallback((e: MouseEvent) => {
        setIsDragging(false)
    }, [])

    const onZoom = useCallback((event) => {
        event.preventDefault();

        const newStretch = Math.max(stretch + event.deltaY * -0.001, 1)
        setStretch(newStretch);
        if (updateStretch.current) clearTimeout(updateStretch.current)
    }, [stretch])

    useEffect(() => {
        const svg = svgRef.current
        if (!svg) return

        svg.addEventListener('mousedown', onDragStart)
        svg.addEventListener('mousemove', onDrag)
        svg.addEventListener('mouseup', onDragEnd)
        svg.addEventListener('wheel', onZoom)

        return () => {
            svg.removeEventListener('mousedown', onDrag)
            svg.removeEventListener('mousemove', onDrag)
        }
    }, [onDrag, onDragEnd, onDragStart, onZoom])

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12} md={12} xl={12}>
                    <RibbonGroup>
                        <Ribbon title='Condition'>
                            <IconButton>
                                <Add />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Collation'>
                            <IconButton
                                disabled={pins.length !== 4}
                                onClick={handleAlign}>
                                <AlignHorizontalCenter />
                            </IconButton>
                            <IconButton onClick={async () => {
                                await collator.current.collateAllRolls()
                                render()
                            }}>
                                <CallMerge />
                            </IconButton>
                            <IconButton onClick={async () => {
                                const activeLayer = stack.find(item => item.active && item.id !== 'working-paper')
                                if (!activeLayer) return
                                const copy = collator.current.findCopy(activeLayer.id)
                                if (!copy) return
                                collator.current.prepareFromRollCopy(copy)
                                render()
                            }}>
                                <CopyAll />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Correction'>
                            <IconButton>
                                <MultipleStop />
                            </IconButton>
                            <IconButton>
                                <ArrowUpward />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Emulation'>
                            <IconButton
                                disabled={stack.find(item => item.active && item.id !== 'working-paper') === null}
                                onClick={() => {
                                    if (isPlaying) {
                                        stopAll()
                                        setIsPlaying(false)
                                    }
                                    else {
                                        const emulation = new Emulation()

                                        const activeRoll = stack.find(copy => copy.active)
                                        console.log('active roll=', activeRoll)
                                        if (!activeRoll) {
                                            emulation.emulateFromCollatedRoll(
                                                collator.current.events)
                                        }
                                        else {
                                            const roll = collator.current.findCopy(activeRoll.id)
                                            if (!roll) return
                                            emulation.emulateFromRoll(roll.events)
                                        }

                                        play(emulation.midiEvents)
                                        setIsPlaying(true)
                                    }
                                }}>
                                {isPlaying ? <Pause /> : <PlayArrow />}
                            </IconButton>
                            <IconButton>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Annotation'>
                            <IconButton
                                disabled={pins.length === 0}
                                onClick={() => {
                                    setCutouts(cutouts => [...cutouts, createCutout(pins)])
                                    setPins([])
                                }}>
                                <ContentCut />
                            </IconButton>
                            <IconButton
                                disabled={!activeCutout}
                                onClick={() => {
                                    setInterpretationDialogOpen(true)
                                }}>
                                <Add />
                            </IconButton>
                        </Ribbon>
                    </RibbonGroup>
                    <RibbonGroup>
                        <Ribbon title='General'>
                            <IconButton onClick={saveAll}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                    </RibbonGroup>
                </Grid>
                <Grid item xs={3}>
                    <Paper sx={{ maxWidth: 360 }}>
                        <Box p={1}>Stack</Box>
                        <List dense>
                            {stack.map((stackItem, i) => {
                                const copy = collator.current.findCopy(stackItem.id)
                                return (
                                    <React.Fragment key={`listItem_${i}`}>
                                        <ListItem
                                            secondaryAction={(
                                                <IconButton edge="end" sx={{ color: stackItem.id === 'working-paper' ? 'blue' : stringToColour(stackItem.id) }}>
                                                    <ColorLens />
                                                </IconButton>
                                            )}>
                                            <ListItemButton
                                                onClick={() => {
                                                    stackItem.active = !stackItem.active
                                                    setStack([...stack])
                                                }}>
                                                <ListItemIcon>
                                                    <IconButton
                                                        size='small'
                                                        edge="start"
                                                        tabIndex={-1}
                                                    >
                                                        {stackItem.active ? <Visibility /> : <VisibilityOff />}
                                                    </IconButton>
                                                </ListItemIcon>
                                                <ListItemText
                                                    secondary={
                                                        (() => {
                                                            if (stackItem.id === 'working-paper') {
                                                                return <span>{collator.current.collatedRolls.length} collated rolls</span>
                                                            }
                                                            if (copy) {
                                                                return <OperationsAsText
                                                                    operations={collator.current.operations.filter(op => op.P16UsedSpecificObject["@id"] === copy.physicalItem["@id"])} />
                                                            }
                                                            return null
                                                        })()
                                                    }
                                                    primary={
                                                        stackItem.id === 'working-paper'
                                                            ? 'Working Paper'
                                                            : copy?.physicalItem["@id"] || 'not defined'} />
                                            </ListItemButton>
                                        </ListItem>
                                        {i === 0 && <Divider flexItem />}
                                    </React.Fragment>
                                )
                            })}
                        </List>
                        <Box>
                            <IconButton onClick={() => setRollCopyDialogOpen(true)}>
                                <Add />
                            </IconButton>
                        </Box>
                    </Paper>
                </Grid >
                <Grid item xs={9}>
                    <Paper>
                        <svg width="1000" height={6 * 100}>
                            <Glow />
                            <g transform={/*`translate(${shiftX}, 0) scale(${stretch}, 1)`*/''} ref={svgRef}>
                                <PinchZoomProvider pinch={shiftX} zoom={stretch} trackHeight={6}>
                                    <RollGrid width={10000} />
                                    <CutoutContainer
                                        cutouts={cutouts}
                                        setCutouts={setCutouts}
                                        active={activeCutout}
                                        onActivate={(cutout) => setActiveCutout(cutout)} />
                                    {stack.slice().reverse().map((stackItem, i) => {
                                        if (!stackItem.active) return null

                                        if (stackItem.id === 'working-paper') {
                                            return (
                                                <WorkingPaper
                                                    key={`copy_${i}`}
                                                    numberOfRolls={collator.current.collatedRolls.length}
                                                    events={collator.current.events}
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

                                        const copy = collator.current.findCopy(stackItem.id)
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
                                        <PinContainer
                                            pins={pins}
                                            remove={pinToRemove => {
                                                setPins(prev => prev.filter(pin => pin["@id"] !== pinToRemove["@id"]))
                                            }} />
                                    )}
                                </PinchZoomProvider>
                            </g>
                        </svg>
                    </Paper>
                </Grid>
            </Grid >

            <RollCopyDialog
                open={rollCopyDialogOpen}
                onClose={() => setRollCopyDialogOpen(false)}
                onDone={async (itemLink, rollAnalysis) => {
                    const newCopy = new RollCopy(itemLink)
                    newCopy.readFromStanfordAton(rollAnalysis)
                    const id = collator.current.addRoll(newCopy)
                    if (!id) return

                    stack.push({
                        id,
                        active: true,
                        color: stringToColour(id)
                    })
                    render()
                }} />

            {activeCutout && <InterpretationDialog
                open={interpretationDialogOpen}
                onClose={() => setInterpretationDialogOpen(false)}
                cutout={activeCutout} />}
        </>
    )
}
