import { Button, Dialog, DialogActions, DialogContent, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { AnyRollEvent, EventDimension } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface TextProps {

}

interface AddEventProps {
    open: boolean
    selection: EventDimension
    onDone: (rollEvent: AnyRollEvent) => void
    onClose: () => void
}

const eventTypes = ['note', 'expression', 'handwrittenText', 'stamp', 'cover'] as const
type EventType = typeof eventTypes[number]

export const AddEventDialog = ({ selection, onDone, onClose, open }: AddEventProps) => {
    const [eventType, setEventType] = useState<EventType>('handwrittenText')
    const [text, setText] = useState<string>()

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

                    {(eventType === 'handwrittenText' || eventType === 'stamp') && (
                        <FormControl>
                            <FormLabel>Text</FormLabel>
                            <TextField
                                size='small'
                                variant='outlined'
                                placeholder='Type text here ...'
                                value={text}
                                onChange={e => setText(e.target.value)}
                            />
                        </FormControl>)}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => {
                        if (eventType === 'stamp' || eventType === 'handwrittenText') {
                            onDone({
                                type: eventType,
                                text: text || '[no text]',
                                hasDimension: selection,
                                id: v4()
                            })
                        }
                        else if (eventType === 'cover') {
                            onDone({
                                type: eventType,
                                hasDimension: selection,
                                id: v4()
                            })
                        }
                    }}
                    variant='contained'>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
