import { Button, Divider, Grid, IconButton, Paper, Slider, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnyEditorialAssumption, AnyRollEvent, CollatedEvent, Edition, Emulation, HorizontalSpan, Intention, isEditorialAssumption, PlaceTimeConversion, RollMeasurement, Stage, VerticalSpan } from 'linked-rolls'
import { isRollEvent, isCollatedEvent } from "linked-rolls"
import { Add, AlignHorizontalCenter, ArrowDownward, ArrowUpward, CallMerge, CallSplit, Clear, ClearAll, Create, Download, EditNote, GroupWork, HelpOutline, JoinFull, Link, Pause, PlayArrow, PsychologyAlt, QuestionMark, Remove, Save, Settings } from "@mui/icons-material"
import { Ribbon } from "./Ribbon"
import { RibbonGroup } from "./RibbonGroup"
import { usePiano } from "react-pianosound"
import { v4 } from "uuid"
import { write } from "midifile-ts"
import { UnifyDialog } from "./UnifyDialog"
import { SeparateDialog } from "./SeparateDialog"
import { StackList } from "./StackList"
import { AssumptionList } from "./AssumptionList"
import { AssignHand } from "./AssignHand"
import { AddHandDialog } from "./AddHand"
import { LayeredRolls } from "./LayeredRolls"
import { downloadFile } from "../../helpers/downloadFile"
import { AddEventDialog } from "./AddEvent"
import { EditAssumption } from "./EditAssumption"
import { ColorDialog } from "./ColorDialog"
import { EmulationSettingsDialog } from "./EmulationSettingsDialog"
import { ImportButton } from "./ImportButton"
import { AddConjecture } from "./AddConjecture"
import DownloadDialog from "./DownloadDialog"
import { stringToColor } from "../../helpers/stringToColor"
import CreateEdition from "./CreateEdition"
import { StageCreationDialog } from "./StageCreationDialog"
import { WithId } from "linked-rolls/lib/WithId"

export interface CollationResult {
    events: CollatedEvent[]
}

export type EventDimension = {
    vertical: VerticalSpan,
    horizontal: HorizontalSpan
}

export type UserSelection = (AnyRollEvent | CollatedEvent | AnyEditorialAssumption | (EventDimension & WithId))[]

export interface LayerInfo {
    id: 'working-paper' | string,
    title: string,
    visible: boolean,
    color: string
    facsimileOpacity: number
    image?: File
}

const workingPaperLayer: LayerInfo = {
    id: 'working-paper',
    title: 'Collation',
    visible: true,
    color: 'blue',
    facsimileOpacity: 0
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
    const { play, stop } = usePiano()

    const [edition, setEdition] = useState<Edition>(new Edition())

    const [stretch, setStretch] = useState(2)
    const [fixedX, setFixedX] = useState(-1)

    const [layers, setLayers] = useState<LayerInfo[]>([workingPaperLayer])
    const [activeLayerId, setActiveLayerId] = useState<string>('working-paper')

    const [stageCreationDialogOpen, setStageCreationDialogOpen] = useState(false)
    const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
    const [unifyDialogOpen, setUnifyDialogOpen] = useState(false)
    const [separateDialogOpen, setSeparateDialogOpen] = useState(false)
    const [assignHandDialogOpen, setAssignHandDialogOpen] = useState(false)
    const [addHandDialogOpen, setAddHandDialogOpen] = useState(false)
    const [addEventDialogOpen, setAddEventDialogOpen] = useState(false)
    const [editArgumentationDialogOpen, setEditArgumentationDialogOpen] = useState(false)
    const [colorToChange, setColorToChange] = useState<LayerInfo>()
    const [emulationSettingsDialogOpen, setEmulationSettingsDialogOpen] = useState(false)
    const [addConjectureOpen, setAddConjectureOpen] = useState(false)
    const [createEditionDialogOpen, setCreateEditionDialogOpen] = useState(true)

    const [selection, setSelection] = useState<UserSelection>([])
    const [isPlaying, setIsPlaying] = useState(false)

    const [currentStage, setCurrentStage] = useState<Stage>()
    const [primarySource, setPrimarySource] = useState('')
    const [conversionMethod, setConversionMethod] = useState<PlaceTimeConversion>()

    const manualMeasurement = useRef<RollMeasurement>({
        software: 'https://github.com/pfefferniels/roll-desk',
        date: new Date(Date.now()).toISOString(),
        id: v4()
    })

    const downloadMIDI = useCallback(async () => {
        if (edition.copies.length === 0) return

        const primary = edition.copies.find(copy => copy.id === primarySource)
        const emulation = new Emulation();

        if (conversionMethod) {
            emulation.placeTimeConversion = conversionMethod
        }

        if (emulation.midiEvents.length === 0) {
            emulation.emulateFromEdition(edition, primary || edition.copies[0]);
        }

        const midiFile = emulation.asMIDI()
        const dataBuf = write(midiFile.tracks, midiFile.header.ticksPerBeat);
        downloadFile('output.mid', dataBuf, 'audio/midi')
    }, [edition, primarySource, conversionMethod])

    const handleAlign = useCallback(() => {
        if (selection.length !== 4 &&
            !selection.every(pin => isCollatedEvent(pin) || isRollEvent(pin))
        ) {
            return
        }

        const copy = edition.copies.find(copy => copy.id === activeLayerId)
        if (!copy) {
            console.log('No active copy selected')
            return
        }

        const eventsInActiveLayer: AnyRollEvent[] = []
        const otherNotes = []
        for (const pin of (selection as (AnyRollEvent | CollatedEvent)[])) {
            if (copy.getOriginalEvents().findIndex(event => event.id === pin.id) !== -1 && !('wasCollatedFrom' in pin)) {
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
                const sum = event.wasCollatedFrom.reduce((acc, curr) => acc + curr.horizontal.from, 0)
                return sum / event.wasCollatedFrom.length
            }
            return event.horizontal.from
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

        copy.applyActions([
            {
                id: v4(),
                type: 'stretch',
                factor: stretch,
                certainty: 'likely',
            },
            {
                id: v4(),
                type: 'shift',
                vertical: 0,
                horizontal: shift,
                certainty: 'likely',
            }
        ])

        setEdition(edition.shallowClone())
        setSelection([])
    }, [activeLayerId, edition, selection])

    const pushAction = useCallback((action: AnyEditorialAssumption) => {
        setEdition(prev => {
            const clone = prev.shallowClone()
            clone.addEditorialAction(action)
            return clone
        })
    }, [])

    const removeEvent = useCallback(() => {
        const currentCopy = edition.copies.find(copy => copy.id === activeLayerId)
        if (!currentCopy) return

        for (const selectedEvent of selection) {
            if (!isRollEvent(selectedEvent)) continue

            currentCopy.removeEvent((selectedEvent as AnyRollEvent).id)
            selection.splice(selection.indexOf(selectedEvent))
        }

        setSelection([...selection])
        setEdition(edition.shallowClone())
    }, [activeLayerId, edition, selection])

    // keeping layers and edition up-to-date
    useEffect(() => {
        setLayers(layers => {
            workingPaperLayer.title = `Collation (${edition.collation.measured.length} roll${edition.collation.measured.length === 1 ? '' : 's'})`

            const newLayers = edition.copies.map(rollCopy => {
                const existingLayer = layers.find(layer => layer.id === rollCopy.id)

                // make sure to keep existing layer settings
                if (existingLayer) {
                    existingLayer.title = rollCopy.siglum
                    return existingLayer
                }
    
                return {
                    id: rollCopy.id,
                    title: rollCopy.siglum,
                    visible: true,
                    color: stringToColor(rollCopy.id),
                    facsimileOpacity: 0
                }
            })
            return [workingPaperLayer, ...newLayers]
        })
    }, [edition])

    const currentCopy = edition.copies.find(copy => copy.id === activeLayerId)

    return (
        <>
            <Grid container m={1} spacing={1}>
                <Grid item xs={12} md={12} xl={12}>
                    <RibbonGroup>
                        <Ribbon title=' '>
                            <ImportButton onImport={newEdition => setEdition(newEdition)} />
                            <IconButton size='small' onClick={() => setDownloadDialogOpen(true)}>
                                <Save />
                            </IconButton>
                        </Ribbon>
                        <Ribbon title='Collation'>
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
                                    edition.collateCopies()
                                    setEdition(edition.shallowClone())
                                }}
                                startIcon={<CallMerge />}
                                disabled={edition.copies.length === 0}
                            >
                                Collate
                            </Button>
                            <IconButton
                                size='small'
                                disabled={
                                    activeLayerId !== 'working-paper'
                                    || edition.collation.events.length === 0
                                }
                                onClick={() => {
                                    edition.collation.events = []
                                    setEdition(edition.shallowClone())
                                }}
                            >
                                <Clear />
                            </IconButton>
                        </Ribbon>
                        {activeLayerId !== 'working-paper' && (
                            <>
                                <Ribbon title='Roll Events'>
                                    <IconButton
                                        size='small'
                                        onClick={() => setAddEventDialogOpen(true)}
                                    >
                                        <Add />
                                    </IconButton>
                                    <IconButton
                                        size='small'
                                        onClick={removeEvent}
                                    >
                                        <Remove />
                                    </IconButton>
                                    <IconButton
                                        size='small'
                                        onClick={() => {
                                            if (!currentCopy) return

                                            const ids = selection.filter(isRollEvent).map(event => event.id)
                                            currentCopy.shiftEventsVertically(ids, 1, manualMeasurement.current)
                                            setEdition(edition.shallowClone())
                                        }}
                                    >
                                        <ArrowUpward />
                                    </IconButton>
                                    <IconButton
                                        size='small'
                                        onClick={() => {
                                            if (!currentCopy) return

                                            const ids = selection.filter(isRollEvent).map(event => event.id)
                                            currentCopy.shiftEventsVertically(ids, -1, manualMeasurement.current)
                                            setEdition(edition.shallowClone())
                                        }}
                                    >
                                        <ArrowDownward />
                                    </IconButton>
                                </Ribbon>
                                <Ribbon title='Conjectures'>
                                    <IconButton
                                        size='small'
                                        onClick={() => setAddConjectureOpen(true)}
                                        disabled={currentCopy === undefined}
                                    >
                                        <Add />
                                    </IconButton>
                                    <Divider orientation='vertical' />
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
                                        Add
                                    </Button>
                                    <Button
                                        size='small'
                                        disabled={selection.findIndex(selection => isRollEvent(selection)) === -1}
                                        onClick={() => setAssignHandDialogOpen(true)}>
                                        Assign
                                    </Button>
                                </Ribbon>
                            </>
                        )}
                        {activeLayerId === 'working-paper' && (
                            <>
                                <Ribbon title='Editing Process'>
                                    <Button
                                        size='small'
                                        onClick={() => {
                                            const creation = edition.stages.find(stage => stage.created === currentStage)
                                            if (!creation) return

                                            creation.edits = []
                                            creation.fillEdits(edition.collation)
                                        }}
                                    >
                                        Fill
                                    </Button>
                                    <Button
                                        size='small'
                                        sx={{ justifyContent: 'flex-start' }}
                                        onClick={() => {
                                            if (!currentStage) return

                                            const stageCreation = edition.stages.find(stage => stage.created === currentStage)
                                            if (!stageCreation) return

                                            const events = selection
                                                .filter(s => isEditorialAssumption(s))
                                                .filter(s => s.type === 'edit')
                                            if (events.length < 2) return

                                            events.slice(1).forEach((edit) => {
                                                if (edit.insert) {
                                                    events[0].insert = events[0].insert || []
                                                    events[0].insert.push(...edit.insert)
                                                }
                                                if (edit.delete) {
                                                    events[0].delete = events[0].delete || []
                                                    events[0].delete.push(...edit.delete)
                                                }

                                                const index = stageCreation.edits.indexOf(edit)
                                                if (index !== -1) {
                                                    stageCreation.edits.splice(index, 1)
                                                }
                                            })

                                            setEdition(edition.shallowClone())
                                            setSelection([events[0]])
                                        }}
                                        startIcon={<GroupWork />}
                                        disabled={activeLayerId !== 'working-paper'}
                                    >
                                        Group
                                    </Button>
                                    <Button
                                        size='small'
                                        sx={{ justifyContent: 'flex-start' }}
                                        onClick={() => setEditArgumentationDialogOpen(true)}
                                        startIcon={<EditNote />}
                                        disabled={!selection.find(isEditorialAssumption)}
                                    >
                                        Comment
                                    </Button>
                                    <Button
                                        size='small'
                                        sx={{ justifyContent: 'flex-start' }}
                                        onClick={() => {
                                            const creation = edition.stages.find(stage => stage.created === currentStage)
                                            if (!creation) return

                                            const intention: Intention = {
                                                type: 'intention',
                                                certainty: 'true',
                                                id: v4(),
                                                description: '',
                                            }
                                            creation.intentions.push(intention)

                                            const premises = selection
                                                .filter(s => isEditorialAssumption(s) && s.type === 'edit')
                                            if (premises.length) {
                                                intention.reasons = [
                                                    {
                                                        type: 'inference',
                                                        premises
                                                    }
                                                ]
                                            }

                                            setSelection([intention])
                                            setEditArgumentationDialogOpen(true)
                                            setEdition(edition.shallowClone())
                                        }}
                                    >
                                        Assume Intention
                                    </Button>
                                </Ribbon>
                                <Divider orientation="vertical" />
                                <Ribbon title="Questions">
                                    <Button
                                        size='small'
                                        sx={{ justifyContent: 'flex-start' }}
                                        onClick={() => {
                                            edition.addEditorialAction({
                                                type: 'question',
                                                id: v4(),
                                                certainty: 'true',
                                                question: '',
                                                reasons: [
                                                    {
                                                        type: 'inference',
                                                        premises: selection.filter(s => isEditorialAssumption(s))
                                                    }
                                                ]
                                            })

                                            setEdition(edition.shallowClone())
                                        }}
                                        startIcon={<PsychologyAlt />}
                                    >
                                        Raise Question
                                    </Button>
                                </Ribbon>
                                <Divider orientation="vertical" />
                                <Ribbon title="Stages">
                                    <ToggleButtonGroup
                                        size="small"
                                        value={currentStage?.siglum || 'all'}
                                        exclusive
                                        onChange={(event, newSiglum) => setCurrentStage(
                                            edition.stages.find(stage => stage.created.siglum === newSiglum)?.created
                                        )}
                                        aria-label="text alignment"
                                    >
                                        {edition.stages.map(stage => {
                                            const siglum = stage.created.siglum

                                            return (
                                                <ToggleButton
                                                    key={`siglum_${siglum}`}
                                                    value={siglum}>
                                                    {siglum}
                                                </ToggleButton>
                                            )
                                        })}
                                        <ToggleButton
                                            value={'all'}>
                                            All
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                    <Button
                                        size='small'
                                        onClick={() => setStageCreationDialogOpen(true)}
                                        startIcon={<Add />}
                                    >
                                        Add Stage
                                    </Button>
                                </Ribbon>
                            </>
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
                                disabled={edition.collation.events.length === 0}
                                onClick={() => {
                                    if (isPlaying) {
                                        stop()
                                        setIsPlaying(false)
                                        return
                                    }

                                    if (edition.copies.length === 0) {
                                        console.log('No existing copies')
                                        return
                                    }

                                    const emulation = new Emulation()
                                    if (conversionMethod) {
                                        emulation.placeTimeConversion = conversionMethod
                                    }
                                    emulation.emulateFromEdition(
                                        edition,
                                        edition.copies.find(copy => copy.id === primarySource) || edition.copies[0],
                                        true
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
                        <Paper sx={{ maxWidth: 360 }} elevation={0}>
                            <div style={{ float: 'left', padding: 8, width: '80%' }}>
                                <b>{edition.title}</b><br />
                                {edition.roll.catalogueNumber} ({edition.roll.recordingEvent.date})
                            </div>
                            <div style={{ float: 'right' }}>
                                <IconButton onClick={() => setCreateEditionDialogOpen(true)}>
                                    <Create />
                                </IconButton>
                            </div>
                        </Paper>

                        <Paper sx={{ maxWidth: 360 }} elevation={0}>
                            <div style={{ float: 'left', padding: 8 }}>
                                <b>{selection.length}</b> events selected
                            </div>
                            <div style={{ float: 'right' }}>
                                <IconButton onClick={() => setSelection([])}>
                                    <ClearAll />
                                </IconButton>
                            </div>
                        </Paper>

                        <StackList
                            stack={layers}
                            setStack={setLayers}
                            edition={edition}
                            activeLayerId={activeLayerId}
                            setActiveLayerId={setActiveLayerId}
                            onChangeColor={(item) => setColorToChange(item)}
                            onChangeEdition={newEdition => {
                                setEdition(newEdition)
                            }}
                        />


                        {(currentCopy ?? edition).actions.length > 0 && (
                            <Paper sx={{ maxWidth: 360, maxHeight: 290, overflow: 'scroll' }}>
                                <AssumptionList
                                    assumptions={(currentCopy ?? edition).actions}
                                    selection={selection.filter(isEditorialAssumption)}
                                    onUpdate={() => {
                                        setSelection([])
                                        setEdition(edition.shallowClone())
                                    }}
                                    removeAction={(action) => {
                                        edition.removeEditorialAction(action)
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
                            currentStage={edition.stages.find(stage => stage.created === currentStage)}
                        />
                    </div>
                </Grid>
            </Grid >

            {
                (separateDialogOpen && selection.length === 1 && isRollEvent(selection[0])) && (
                    <SeparateDialog
                        open={separateDialogOpen}
                        onClose={() => setSeparateDialogOpen(false)}
                        selection={selection[0] as AnyRollEvent}
                        clearSelection={() => setSelection([])}
                        breakPoint={fixedX}
                        onDone={pushAction}
                    />
                )
            }

            {unifyDialogOpen && <UnifyDialog
                open={unifyDialogOpen}
                selection={selection.filter(pin => isRollEvent(pin)) as AnyRollEvent[]}
                clearSelection={() => setSelection([])}
                onDone={pushAction}
                onClose={() => setUnifyDialogOpen(false)}
            />}

            {
                (assignHandDialogOpen && currentCopy) && (
                    <AssignHand
                        open={assignHandDialogOpen}
                        onDone={(assignment) => {
                            if (assignment) {
                                pushAction(assignment)
                            }
                            setAssignHandDialogOpen(false)
                        }}
                        copy={currentCopy}
                        clearSelection={() => setSelection([])}
                        selection={selection.filter(pin => isRollEvent(pin)) as AnyRollEvent[]}
                    />)
            }

            {
                (addHandDialogOpen && currentCopy) && (
                    <AddHandDialog
                        open={addHandDialogOpen}
                        onDone={(editing) => {
                            setAddHandDialogOpen(false)
                        }}
                        copy={currentCopy}
                    />)
            }

            {
                (currentCopy && !!selection.find(selection => 'horizontal' in selection)) && (
                    <AddEventDialog
                        open={addEventDialogOpen}
                        selection={selection.find(selection => 'horizontal' in selection) as EventDimension}
                        onClose={() => setAddEventDialogOpen(false)}
                        copy={currentCopy}
                        measurement={manualMeasurement.current}
                    />)
            }

            {
                editArgumentationDialogOpen && (
                    <EditAssumption
                        existingPremises={edition.actions.filter(isEditorialAssumption)}
                        open={editArgumentationDialogOpen}
                        onClose={() => {
                            setEdition(edition.shallowClone())
                            setEditArgumentationDialogOpen(false)
                            setSelection([])
                        }}
                        selection={selection.filter(isEditorialAssumption)!}
                    />)
            }

            {
                colorToChange && (
                    <ColorDialog
                        open={colorToChange !== undefined}
                        onClose={() => setColorToChange(undefined)}
                        onSave={(newLayerInfo) => {
                            const index = layers.findIndex(l => l.id === newLayerInfo.id)
                            if (index === -1) return
                            layers.splice(index, 1, newLayerInfo)
                            setLayers([...layers])
                        }}
                        layerInfo={colorToChange}
                    />)
            }

            {emulationSettingsDialogOpen && (
                <EmulationSettingsDialog
                    open={emulationSettingsDialogOpen}
                    onClose={() => {
                        setEmulationSettingsDialogOpen(false)
                    }}
                    edition={edition}
                    onDone={(primaryCopy, conversion) => {
                        setPrimarySource(primaryCopy)
                        setConversionMethod(conversion)
                    }}
                />
            )}

            {
                (addConjectureOpen && currentCopy) && (
                    <AddConjecture
                        open={addConjectureOpen}
                        onClose={() => setAddConjectureOpen(false)}
                        copy={currentCopy}
                        selection={selection.filter(event => isRollEvent(event)) as AnyRollEvent[]}
                        clearSelection={() => setSelection([])}
                    />
                )
            }

            {downloadDialogOpen && <DownloadDialog
                open={downloadDialogOpen}
                edition={edition}
                onClose={() => setDownloadDialogOpen(false)}
            />}

            {createEditionDialogOpen && <CreateEdition
                onDone={(edition) => {
                    setEdition(edition)
                }}
                onClose={() => setCreateEditionDialogOpen(false)}
                open={createEditionDialogOpen}
                edition={edition}
            />}

            {stageCreationDialogOpen && (
                <StageCreationDialog
                    open={stageCreationDialogOpen}
                    onClose={() => setStageCreationDialogOpen(false)}
                    onDone={(creation) => edition.stages.push(creation)}
                    clearSelection={() => setSelection([])}
                    edition={edition}
                />
            )}
        </>
    )
}
