import { Button, Checkbox, Dialog, DialogActions, DialogContent, FormControl, FormControlLabel, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { RollCopy, AnyRollEvent, WelteT100 } from "linked-rolls"
import { RollMeasurement } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"
import { EventDimension } from "./RollDesk"

interface AddEventProps {
    open: boolean
    selection: EventDimension
    copy: RollCopy
    measurement: RollMeasurement
    onClose: () => void
}

const eventTypes = ['perforation', 'cover', 'handwrittenText', 'stamp', 'rollLabel'] as const
type EventType = typeof eventTypes[number]

export const AddEventDialog = ({ selection, onClose, open, copy, measurement }: AddEventProps) => {
    const [eventType, setEventType] = useState<EventType>('handwrittenText')
    const [text, setText] = useState<string>()
    const [rotation, setRotation] = useState<number>()
    const [signed, setSigned] = useState<boolean>()

    const perforationMeaning = new WelteT100().meaningOf(selection.vertical.from)

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
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

                    {(perforationMeaning.type === 'expression' && (
                        <ul>
                            <li>
                                Scope: {perforationMeaning.scope}
                            </li>
                            <li>
                                Type: {perforationMeaning.expressionType}
                            </li>
                        </ul>
                    ))}

                    {(perforationMeaning.type === 'note' && (
                        <ul>
                            <li>
                                Note: {perforationMeaning.pitch}
                            </li>
                        </ul>
                    ))}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => {
                        let eventToAdd: AnyRollEvent | undefined = undefined
                        if (eventType === 'rollLabel') {
                            eventToAdd = {
                                type: eventType,
                                text: text || '[no text]',
                                ...selection,
                                signed: signed === undefined ? false : signed,
                                id: v4(),
                                measurement
                            }
                        }
                        if (eventType === 'stamp' || eventType === 'handwrittenText') {
                            eventToAdd = {
                                type: eventType,
                                text: text || '[no text]',
                                rotation,
                                ...selection,
                                id: v4(),
                                measurement
                            }
                        }
                        else if (eventType === 'cover') {
                            eventToAdd = {
                                type: eventType,
                                ...selection,
                                id: v4(),
                                measurement
                            }
                        }

                        else if (eventType === 'perforation') {
                            eventToAdd = {
                                ...perforationMeaning,
                                ...selection,
                                id: v4(),
                                measurement
                            }
                        }

                        if (eventToAdd) {
                            copy.insertEvent(eventToAdd)
                        }

                        onClose()
                    }
                    }
                    variant='contained'>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
