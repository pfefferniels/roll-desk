import { Box, Divider, Grid, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper } from "@mui/material"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Collator, Emulation, RollCopy, createCutout } from 'linked-rolls'
import { RollCopyDialog } from "./RollCopyDialog"
import { CollatedEvent, Note, Expression, Cutout } from "linked-rolls/lib/.ldo/rollo.typings"
import { RollCopyViewer } from "./RollCopyViewer"
import { Add, AlignHorizontalCenter, ArrowBack, ArrowUpward, CallMerge, ColorLens, ContentCut, CopyAll, MultipleStop, Pause, PlayArrow, Save, Visibility, VisibilityOff } from "@mui/icons-material"
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
import { DatasetContext, useSession } from "@inrupt/solid-ui-react"
import { SolidDataset, Thing, addUrl, asUrl, buildThing, getContainedResourceUrlAll, getFile, getSolidDataset, getSourceUrl, getStringNoLocale, getThing, getThingAll, getUrl, getUrlAll, overwriteFile, saveFileInContainer, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { crm, frbroo, mer, rollo } from "../../helpers/namespaces"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { datasetUrl } from "../../helpers/datasetUrl"
import { v4 } from "uuid"
import { Editor } from "linked-rolls/lib/Editor"
import { datasetToString } from "@ldo/rdf-utils"
import { useNavigate } from "react-router-dom"
import { useSnackbar } from "../../providers/SnackbarContext"
import { parseRdf } from "ldo"

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
    const { session } = useSession()
    const navigate = useNavigate()
    const { setMessage } = useSnackbar()
    const { play, stopAll } = usePiano()

    const [collator,] = useState<Collator>(new Collator())
    const [emulation,] = useState<Emulation>(new Emulation())

    const [solidDataset, setDataset] = useState<SolidDataset>()
    const [rollWork, setRollWork] = useState<Thing | null>()
    const [physicalExpression, setPhysicalExpression] = useState<Thing | null>()
    const [digitalExpression, setDigitalExpression] = useState<Thing>()

    const [rerender, setRerender] = useState(0)
    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState(false)
    const [interpretationDialogOpen, setInterpretationDialogOpen] = useState(false)
    const [stack, setStack] = useState<({
        id: 'working-paper' | string,
        title: string,
        active: boolean,
        color: string
    })[]>([{
        id: 'working-paper',
        title: 'Working Paper',
        active: true,
        color: 'blue'
    }])
    const [pins, setPins] = useState<(Note | Expression | CollatedEvent)[]>([])
    const [cutouts, setCutouts] = useState<Cutout[]>([])
    const [activeCutout, setActiveCutout] = useState<Cutout>()

    const [isDragging, setIsDragging] = useState(false)
    const [shiftX, setShiftX] = useState(0)
    const [stretch, setStretch] = useState(2)

    const [isPlaying, setIsPlaying] = useState(false)

    const svgRef = useRef<SVGGElement>(null)

    const render = () => setRerender(rerender => rerender + 1)

    const saveAll = async () => {
        if (!solidDataset || !rollWork) return
        setMessage('Saving all ...')

        if (emulation.midiEvents.length === 0) {
            setMessage('Running emulation')
            emulation.emulateFromCollatedRoll(
                collator.events)
        }

        setMessage('Combining datasets for emulation and collation')

        const eventDataset = await emulation.asDataset().union(
            await collator.asDataset()
        )

        setMessage('Generating turtle')
        const turtle = await datasetToString(eventDataset, {})

        if (!digitalExpression) {
            setMessage('Cannot proceed without an existing digital expression.')
            return
        }

        let changedDataset = solidDataset
        setMessage('Attaching data to existing digital expression')
        const eventsUrl = getUrl(digitalExpression, RDFS.label)
        if (!eventsUrl) return
        const fileName = eventsUrl.slice(eventsUrl.lastIndexOf('/')).replace('.ttl', '')
        changedDataset = setThing(solidDataset, digitalExpression)
        changedDataset = await saveSolidDatasetAt(getSourceUrl(solidDataset)!, changedDataset, { fetch: session.fetch as any })

        // TODO use private POD
        const savedFile = await overwriteFile(
            eventsUrl,
            new File([turtle], fileName, { type: 'text/turtle' }),
            { fetch: session.fetch as any })

        setMessage('Done')
        if (!savedFile) {
            setMessage('Failed saving file for ' + eventsUrl)
        }

        // Save cutouts
        setMessage('Saving cutouts')
        for (const cutout of cutouts) {
            const cutoutThing = buildThing({
                url: cutout["@id"] || `${getSourceUrl(solidDataset)}#${v4()}`
            })

            cutoutThing.addUrl(RDF.type, rollo(cutout.type["@id"]))
            for (const part of cutout.P106IsComposedOf) {
                if (!part["@id"]) continue
                cutoutThing.addUrl(crm('P106_is_composed_of'), part["@id"])
            }

            changedDataset = setThing(changedDataset, cutoutThing.build())
        }
        setDataset(await saveSolidDatasetAt(getSourceUrl(solidDataset)!, changedDataset, { fetch: session.fetch as any }))
        setMessage('Done.')
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
        const copy = collator.findCopy(active.id)
        if (!copy) return

        collator.stretchRollCopy(copy, stretch)
        collator.shiftRollCopy(copy, shift, 0)
        collator.applyOperations()

        setPins([])
    }

    const updateStretch = useRef<ReturnType<typeof setTimeout> | null>(null)

    const onDragStart = useCallback(() => {
        setIsDragging(true)
    }, [])

    const onDrag = useCallback((e: MouseEvent) => {
        if (!isDragging) return
        setShiftX(prev => prev + e.movementX)
    }, [isDragging])

    const onDragEnd = useCallback(() => {
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

    useEffect(() => {
        const fetchRoll = async () => {
            setMessage('Fetching dataset')
            const dataset = await getSolidDataset(url, { fetch: session.fetch as any })
            if (!dataset) return

            let newRollWork = getThing(dataset, url)
            if (!newRollWork) {
                setMessage(`Given work ${url} could not be found in the dataset`)
                return
            }

            let physicalExpressionThing, digitalExpressionThing
            const expressionUrls = getUrlAll(newRollWork, frbroo('R12_is_realised_in'))
            for (const url of expressionUrls) {
                const thing = getThing(dataset, url)
                if (!thing) continue

                if (getUrlAll(thing, crm('P2_has_type')).includes(mer('PhysicalExpression'))) {
                    setMessage(`Physical expression found`)
                    physicalExpressionThing = thing
                }
                else if (getUrlAll(thing, crm('P2_has_type')).includes(mer('DigitalExpression'))) {
                    setMessage(`Digital expression found`)
                    digitalExpressionThing = thing

                    const datasetUrl = getUrl(thing, RDFS.label)
                    if (!datasetUrl) continue

                    setMessage(`Loading roll events associated with the digital expression.`)
                    try {
                        const file = await getFile(datasetUrl, { fetch: session.fetch as any })
                        collator.importFromDataset(await parseRdf(await file.text()))
                        setMessage('Digital expression sucessfully imported')
                    }
                    catch (e) {
                        setMessage(`No file yet associated with the digital expression.`)
                    }

                    // Find cutouts referring to events inside that dataset
                    const things = getThingAll(dataset)
                    setCutouts(
                        things
                            .filter(thing => {
                                const linkedEvents = getUrlAll(thing, crm('P106_is_composed_of'))
                                if (linkedEvents.length === 0) return false

                                console.log('testing if', linkedEvents, 'all start with', datasetUrl)
                                return (linkedEvents.every(event => event.startsWith(datasetUrl)))
                            })
                            .map(thing => ({
                                '@id': asUrl(thing),
                                'P106IsComposedOf': getUrlAll(thing, crm('P106_is_composed_of')).map(url => ({
                                    '@id': url
                                })),
                                'type': { '@id': 'Selection' }
                            }))
                    )
                }
            }

            let updatedDataset = dataset
            if (!physicalExpressionThing) {
                physicalExpressionThing = buildThing()
                    .addUrl(RDF.type, frbroo('F26_Recording'))
                    .addUrl(RDF.type, frbroo('F3_Manifestation_Product_Type'))
                    .addUrl(crm('P2_type'), mer('PhysicalExpression'))
                    .addUrl(frbroo('R12i_realises'), newRollWork)
                    .build()
                newRollWork = addUrl(newRollWork, frbroo('R12_is_realised_in'), physicalExpressionThing)

                updatedDataset = setThing(dataset, physicalExpressionThing)
                updatedDataset = setThing(updatedDataset, newRollWork)
                updatedDataset = await saveSolidDatasetAt(url, updatedDataset, { fetch: session.fetch as any })
            }

            if (!digitalExpressionThing) {
                setMessage('Creating new digital expression')
                digitalExpressionThing = buildThing()
                    .addUrl(RDF.type, frbroo('F26_Recording'))
                    .addUrl(crm('P2_has_type'), mer('DigitalExpression'))
                    .addUrl(RDFS.label, `${datasetUrl}/${v4()}.ttl`)
                    .build()
                newRollWork = addUrl(newRollWork, frbroo('R12_is_realised_in'), digitalExpressionThing)

                updatedDataset = setThing(dataset, digitalExpressionThing)
                updatedDataset = setThing(updatedDataset, newRollWork)
                updatedDataset = await saveSolidDatasetAt(getSourceUrl(dataset)!, updatedDataset, { fetch: session.fetch as any })
            }

            setDataset(updatedDataset)
            setRollWork(newRollWork)
            setPhysicalExpression(physicalExpressionThing)
            setDigitalExpression(digitalExpressionThing)
            setMessage('Done')
        }

        fetchRoll()
    }, [session.fetch, setMessage, url, collator])

    useEffect(() => {
        if (!digitalExpression) return 

        const eventsDataset = getUrl(digitalExpression, RDFS.label) || ''
        collator.baseURI = eventsDataset
        emulation.baseURI = eventsDataset
    }, [digitalExpression, collator, emulation])

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12} md={12} xl={12}>
                    <RibbonGroup>
                        <Ribbon title=' '>
                            <IconButton onClick={() => navigate('/')}>
                                <ArrowBack />
                            </IconButton>
                            <IconButton
                                disabled={!digitalExpression}
                                onClick={saveAll}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Collation'>
                            <IconButton
                                disabled={!digitalExpression}
                                onClick={async () => {
                                console.log('collator.baseURI', collator.baseURI)
                                const activeLayer = stack.find(item => item.active && item.id !== 'working-paper')
                                if (!activeLayer) return
                                const copy = collator.findCopy(activeLayer.id)
                                if (!copy) return
                                collator.prepareFromRollCopy(copy)
                                render()
                            }}>
                                <CopyAll />
                            </IconButton>
                            <IconButton
                                disabled={pins.length !== 4}
                                onClick={handleAlign}>
                                <AlignHorizontalCenter />
                            </IconButton>
                            <IconButton onClick={async () => {
                                await collator.collateAllRolls()
                                render()
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
                        <Ribbon title='Emulation'>
                            <IconButton
                                disabled={stack.find(item => item.active && item.id !== 'working-paper') === null}
                                onClick={() => {
                                    if (isPlaying) {
                                        stopAll()
                                        setIsPlaying(false)
                                    }
                                    else {
                                        const activeLayer = stack.find(copy => copy.active)
                                        if (!activeLayer) return

                                        if (activeLayer?.id === 'working-paper') {
                                            emulation.emulateFromCollatedRoll(
                                                collator.events)
                                            play(emulation.midiEvents)
                                        }
                                        else {
                                            const emulation = new Emulation()

                                            const roll = collator.findCopy(activeLayer.id)
                                            if (!roll) return
                                            emulation.emulateFromRoll(roll.events)
                                        }

                                        setIsPlaying(true)
                                    }
                                }}>
                                {isPlaying ? <Pause /> : <PlayArrow />}
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Annotation'>
                            <IconButton
                                disabled={pins.length === 0}
                                onClick={() => {
                                    const containerUrl = (solidDataset && getSourceUrl(solidDataset))
                                    console.log('container URL=', containerUrl)
                                    setCutouts(cutouts => [...cutouts, createCutout(pins, containerUrl || 'https://linked-rolls.org/')])
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
                </Grid>
                <Grid item xs={3}>
                    <Paper sx={{ maxWidth: 360 }}>
                        <Box p={1}>Stack</Box>
                        <List dense>
                            {stack.map((stackItem, i) => {
                                const copy = collator.findCopy(stackItem.id)
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
                                                                return <span>{collator.collatedRolls.length} collated rolls</span>
                                                            }
                                                            if (copy) {
                                                                return <OperationsAsText
                                                                    operations={collator.operations.filter(op => op.P16UsedSpecificObject["@id"] === copy.physicalItem["@id"])} />
                                                            }
                                                            return null
                                                        })()
                                                    }
                                                    primary={stackItem.title} />
                                            </ListItemButton>
                                        </ListItem>
                                        {i === 0 && <Divider flexItem />}
                                    </React.Fragment>
                                )
                            })}
                        </List>
                        <Box>
                            <IconButton
                                disabled={!digitalExpression}
                                onClick={() => setRollCopyDialogOpen(true)}>
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

                                    {stack.slice().reverse().map((stackItem, i) => {
                                        if (!stackItem.active) return null

                                        if (stackItem.id === 'working-paper') {
                                            return (
                                                <WorkingPaper
                                                    key={`copy_${i}`}
                                                    numberOfRolls={collator.collatedRolls.length}
                                                    events={collator.events}
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

                                        const copy = collator.findCopy(stackItem.id)
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

                                    <DatasetContext.Provider value={{ solidDataset, setDataset }}>
                                        <CutoutContainer
                                            cutouts={cutouts}
                                            setCutouts={setCutouts}
                                            active={activeCutout}
                                            onActivate={(cutout) => setActiveCutout(cutout)} />
                                    </DatasetContext.Provider>
                                </PinchZoomProvider>
                            </g>
                        </svg>
                    </Paper>
                </Grid>
            </Grid>

            <DatasetContext.Provider value={{ solidDataset, setDataset }}>
                <RollCopyDialog
                    open={rollCopyDialogOpen}
                    onClose={() => setRollCopyDialogOpen(false)}
                    attachTo={physicalExpression || undefined}
                    onDone={async (item, rollAnalysis) => {
                        const newCopy = new RollCopy(asUrl(item))
                        newCopy.baseURI = collator.baseURI
                        newCopy.readFromStanfordAton(rollAnalysis)
                        const id = collator.addRoll(newCopy)
                        if (!id) return

                        stack.push({
                            id,
                            title: getStringNoLocale(item, crm('P102_has_title')) || '[untitled]',
                            active: true,
                            color: stringToColour(id)
                        })
                        render()
                    }} />

                {activeCutout && (
                    <InterpretationDialog
                        open={interpretationDialogOpen}
                        onClose={() => setInterpretationDialogOpen(false)}
                        attachToRoll={rollWork || undefined}
                        cutout={activeCutout["@id"]} />
                )}
            </DatasetContext.Provider>
        </>
    )
}
