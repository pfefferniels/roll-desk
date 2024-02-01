import { Box, Grid, IconButton, List, ListItemButton, ListItemText, Paper, ToggleButton } from "@mui/material"
import { useCallback, useEffect, useRef, useState } from "react"
import { Collator, RollCopy } from 'linked-rolls'
import { RollCopyDialog } from "./RollCopyDialog"
import { CollatedEvent, Note, Expression } from "linked-rolls/lib/.ldo/rollo.typings"
import { RollCopyViewer } from "./RollCopyViewer"
import { Add, AlignHorizontalCenter, ArrowUpward, CallMerge, MultipleStop } from "@mui/icons-material"
import { OperationsAsText } from "./OperationAsText"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { WorkingPaper } from "./WorkingPaper"

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
    const [copyOnTop, setCopyOnTop] = useState<string>()
    const [alignMode, setAlignMode] = useState<'shift' | 'stretch' | false>(false)
    const [isDragging, setIsDragging] = useState(false)
    const [shiftX, setShiftX] = useState(0)
    const [stretch, setStretch] = useState(1)

    const [positions, setPositions] = useState<[[number | undefined, number | undefined], [number | undefined, number | undefined]]>([[undefined, undefined], [undefined, undefined]])

    const collator = useRef(new Collator())
    const svgRef = useRef<SVGGElement>(null)

    const render = () => setRerender(rerender => rerender + 1)

    const findPartner = (forEvent: (Note | Expression)) => {
        //if (collatedEvents.length === 0) return
        //
        //return collatedEvents[0].wasCollatedFrom || []
        return []
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
    })

    console.log(copyOnTop)

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12}>
                    <RibbonGroup>
                        <Ribbon title='Condition'>
                            <IconButton>
                                <Add />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Collation'>
                            <ToggleButton value='align' selected={!!alignMode} onChange={() => setAlignMode(alignMode => !!alignMode ? false : 'shift')}>
                                <AlignHorizontalCenter />
                            </ToggleButton>
                            <IconButton onClick={async () => {
                                // collator.current.prepareFromRollCopy(copies[0])
                                // for (let i = 1; i < copies.length; i++) {
                                //     await collator.current.collateWith(copies[i])
                                // }
                                // setCollatedEvents(collator.current.events)
                            }}>
                                <CallMerge />
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
                        <Ribbon title='Annotation'>
                            <IconButton>
                                <Add />
                            </IconButton>
                        </Ribbon>
                    </RibbonGroup>
                </Grid >
                <Grid item xs={2}>
                    <Paper sx={{ maxWidth: 360 }}>
                        <span>Rolls</span>
                        <List>
                            {collator.current.rolls.map((copy, i) => (
                                <ListItemButton
                                    selected={copyOnTop === copy.physicalItem["@id"]}
                                    onClick={() => setCopyOnTop(copy.physicalItem["@id"])}>
                                    <ListItemText
                                        secondary={
                                            <OperationsAsText operations={collator.current.operations.filter(op => op.P16UsedSpecificObject["@id"] === copy.physicalItem["@id"])} />
                                        }
                                        primary={copy.physicalItem["@id"] || 'not defined'} />
                                </ListItemButton>
                            ))}
                        </List>
                        <Box>
                            <IconButton onClick={() => setRollCopyDialogOpen(true)}>
                                <Add />
                            </IconButton>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={10}>
                    <Paper>
                        <svg width="10000" height="500">
                            <g transform={`translate(${shiftX}, 0) scale(${stretch}, 1)`} ref={svgRef}>
                                {collator.current.rolls.map((copy, i) => (
                                    <RollCopyViewer
                                        key={`copy_${i}`}
                                        copy={copy}
                                        onClick={(event) => {
                                            if (!alignMode) return
                                            
                                            if (!positions[0][0]) {
                                                positions[0][0] = event.P43HasDimension.from
                                                console.log('positions=', positions)
                                                return
                                            }

                                            positions[1][0] = event.P43HasDimension.to

                                            if (!positions[0][1] || !positions[1][1]) return

                                            console.log('positions=', positions)

                                            const stretch = (positions[1][1] - positions[0][1]) / (positions[1][0] - positions[0][0])
                                            const shift = positions[0][1] - stretch * positions[0][0]

                                            console.log('shift=', shift, 'stretch=', stretch)

                                            collator.current.stretchRollCopy(copy, stretch)
                                            collator.current.shiftRollCopy(copy, shift, 0)
                                            collator.current.applyOperations()
                                            setAlignMode(false)
                                        }} />
                                ))}

                                <WorkingPaper
                                    events={collator.current.events}
                                    onClick={(event: CollatedEvent) => {
                                        if (!alignMode) return

                                        if (!positions[0][1]) {
                                            positions[0][1] = event.wasCollatedFrom!.at(0)!.P43HasDimension.from
                                        }
                                        else {
                                            positions[1][1] = event.wasCollatedFrom!.at(0)!.P43HasDimension.to
                                        }
                                    }} />
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
                    collator.current.addRoll(newCopy)
                    render()
                }} />
        </>
    )
}
