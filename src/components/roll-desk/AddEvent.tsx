import { Button, Checkbox, Dialog, DialogActions, DialogContent, FormControl, FormControlLabel, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { keyToType, RollCopy } from "linked-rolls"
import { AnyRollEvent, EventDimension, ExpressionType } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface AddEventProps {
    open: boolean
    selection: EventDimension
    copy: RollCopy
    onDone: (modifiedCopy: RollCopy) => void
    onClose: () => void
}

const eventTypes = ['note', 'expression', 'cover', 'handwrittenText', 'stamp', 'rollLabel'] as const
type EventType = typeof eventTypes[number]

export const AddEventDialog = ({ selection, onDone, onClose, open, copy }: AddEventProps) => {
    const [eventType, setEventType] = useState<EventType>('handwrittenText')
    const [text, setText] = useState<string>()
    const [rotation, setRotation] = useState<number>()
    const [signed, setSigned] = useState<boolean>()

    // TODO: this should be part of the lib
    const determineScope = (selection: EventDimension) => {
        return selection.vertical.from < 15 ? 'bass' : 'treble'
    }

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

                    {(eventType === 'expression' && (
                        <div>
                            Scope: {determineScope(selection)}
                            <br />
                            Type: {keyToType(selection.vertical.from + 13)}
                        </div>
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
                                hasDimension: selection,
                                signed: signed === undefined ? false : signed,
                                id: v4()
                            }
                        }
                        if (eventType === 'stamp' || eventType === 'handwrittenText') {
                            eventToAdd = {
                                type: eventType,
                                text: text || '[no text]',
                                rotation,
                                hasDimension: selection,
                                id: v4()
                            }
                        }
                        else if (eventType === 'cover') {
                            eventToAdd = {
                                type: eventType,
                                hasDimension: selection,
                                id: v4()
                            }
                        }
                        else if (eventType === 'expression') {
                            const key = selection.vertical.from + 13
                            const scope = determineScope(selection)
                            const type = keyToType(key)
                            if (!type) return

                            eventToAdd = {
                                type: 'expression',
                                P2HasType: type as ExpressionType,
                                hasScope: scope,
                                hasDimension: selection,
                                id: v4()
                            }
                        }

                        if (eventToAdd) {
                            copy.insertEvent(eventToAdd)
                            onDone(copy.shallowClone())
                        }
                    }}
                    variant='contained'>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
