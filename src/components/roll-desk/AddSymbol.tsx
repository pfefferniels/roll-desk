import { Button, Checkbox, Dialog, DialogActions, DialogContent, Divider, FormControl, FormControlLabel, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { assign, RollFeature, Stage, WelteT100 } from "linked-rolls"
import { useState } from "react"
import { v4 } from "uuid"
import { EventDimension } from "./RollDesk"
import { AnySymbol, CarrierAssignment } from "linked-rolls/lib/Symbol"

interface AddSymbolProps {
    open: boolean
    selection: EventDimension
    iiifUrl?: string
    onClose: () => void
}

const eventTypes = ['perforation', 'cover', 'handwrittenText', 'stamp', 'rollLabel'] as const
type EventType = typeof eventTypes[number]

export const AddSymbolDialog = ({ selection, open, onClose, iiifUrl }: AddSymbolProps) => {
    const [eventType, setEventType] = useState<EventType>('handwrittenText')
    const [text, setText] = useState<string>()
    const [rotation, setRotation] = useState<number>()
    const [signed, setSigned] = useState<boolean>()
    const [material, setMaterial] = useState<string>()

    const [transcription, setTranscription] = useState<CarrierAssignment>()
    const [stage, setStage] = useState<Stage>()

    const perforationMeaning = eventType === 'perforation'
        ? new WelteT100().meaningOf(selection.vertical.from)
        : undefined

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <img
                    src={iiifUrl}
                    alt="IIIF"
                    width='300px'
                />
                <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                    <FormControl>
                        <FormLabel>Type</FormLabel>
                        <Select
                            size='small'
                            value={eventType}
                            onChange={e => setEventType(e.target.value as EventType)}
                        >
                            {eventTypes.map((eventType) => {
                                return (
                                    <MenuItem value={eventType} key={eventType}>
                                        {eventType}
                                    </MenuItem>
                                )
                            })}
                        </Select>
                    </FormControl>

                    {(eventType === 'handwrittenText' || eventType === 'stamp' || eventType === 'rollLabel') && (
                        <>
                            <FormControl>
                                <FormLabel>Text</FormLabel>
                                <TextField
                                    multiline
                                    rows={3}
                                    size='small'
                                    variant='outlined'
                                    placeholder='Type text here ...'
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Rotation</FormLabel>
                                <TextField
                                    size='small'
                                    variant='outlined'
                                    placeholder='Rotation (in degrees)'
                                    value={rotation}
                                    onChange={e => setRotation(+e.target.value)}
                                />
                            </FormControl>
                        </>
                    )}

                    {(eventType === 'rollLabel') && (
                        <>
                            <FormControlLabel control={
                                <Checkbox
                                    onChange={(e) => setSigned(e.target.checked)}
                                    checked={signed}
                                />
                            }
                                label="has signature?" />
                        </>
                    )}

                    {(perforationMeaning?.type === 'expression' && (
                        <ul>
                            <li>
                                Scope: {perforationMeaning.scope}
                            </li>
                            <li>
                                Type: {perforationMeaning.expressionType}
                            </li>
                        </ul>
                    ))}

                    {(perforationMeaning?.type === 'note' && (
                        <ul>
                            <li>
                                Note: {perforationMeaning.pitch}
                            </li>
                        </ul>
                    ))}

                    {(eventType === 'cover') && (
                        <FormControl>
                            <FormLabel>Material, color, ...</FormLabel>
                            <TextField
                                size='small'
                                variant='outlined'
                                placeholder='Material'
                                value={material}
                                onChange={e => setMaterial(e.target.value)}
                            />
                        </FormControl>
                    )}

                    <Divider />
                    <FormControl>
                        <FormLabel>Transcription</FormLabel>
                        <i>
                            TODO: here you can edit information
                            e.g. about who did the transcription
                            and which complications were part of it.
                        </i>
                    </FormControl>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => {
                        if (!stage || !transcription) {
                            console.log('No stage or transcription provided')
                            return
                        }

                        const rollSelection = structuredClone(selection) as EventDimension

                        const feature: RollFeature = {
                            id: v4(),
                            ...rollSelection,
                            annotates: iiifUrl
                        }

                        const base = {
                            id: v4(),
                            carriers: [assign('carrierAssignment', feature)],
                        }

                        let newSymbol: AnySymbol | undefined = undefined
                        if (eventType === 'rollLabel') {
                            newSymbol = {
                                type: eventType,
                                text: text || '[no text]',
                                signed: signed === undefined ? false : signed,
                                ...base
                            }
                        }
                        else if (eventType === 'stamp' || eventType === 'handwrittenText') {
                            newSymbol = {
                                type: eventType,
                                text: text || '[no text]',
                                rotation,
                                ...base
                            }
                        }
                        else if (eventType === 'cover') {
                            newSymbol = {
                                type: eventType,
                                note: material,
                                ...base
                            }
                        }
                        else if (eventType === 'perforation' && perforationMeaning) {
                            newSymbol = {
                                ...perforationMeaning,
                                ...base
                            }
                        }

                        if (newSymbol) {
                            stage.edits.push({
                                id: v4(),
                                insert: [newSymbol],
                            })
                        }
                        onClose()
                    }}
                    variant='contained'
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
