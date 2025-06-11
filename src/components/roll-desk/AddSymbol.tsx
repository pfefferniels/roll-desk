import { Button, Checkbox, Dialog, DialogActions, DialogContent, FormControl, FormControlLabel, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { RollCopy, RollFeature, RollMeasurement, WelteT100 } from "linked-rolls"
import { useState } from "react"
import { v4 } from "uuid"
import { EventDimension } from "./RollDesk"
import { AnySymbol } from "linked-rolls/lib/Symbol"

interface AddSymbolProps {
    open: boolean
    selection: EventDimension
    copy: RollCopy
    measurement: RollMeasurement
    iiifUrl?: string
    onDone: (symbol: AnySymbol) => void
    onClose: () => void
}

const eventTypes = ['perforation', 'cover', 'handwrittenText', 'stamp', 'rollLabel'] as const
type EventType = typeof eventTypes[number]

export const AddSymbolDialog = ({ selection, open, onClose, onDone, measurement, iiifUrl }: AddSymbolProps) => {
    const [eventType, setEventType] = useState<EventType>('handwrittenText')
    const [text, setText] = useState<string>()
    const [rotation, setRotation] = useState<number>()
    const [signed, setSigned] = useState<boolean>()
    const [material, setMaterial] = useState<string>()

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
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => {
                        const rollSelection = structuredClone(selection) as EventDimension

                        const feature: RollFeature = {
                            id: v4(),
                            ...rollSelection,
                            measurement,
                            annotates: iiifUrl
                        }

                        let newSymbol: AnySymbol | undefined = undefined
                        if (eventType === 'rollLabel') {
                            newSymbol = {
                                type: eventType,
                                text: text || '[no text]',
                                signed: signed === undefined ? false : signed,
                                isCarriedBy: [feature],
                                id: v4()
                            }
                        }
                        if (eventType === 'stamp' || eventType === 'handwrittenText') {
                            newSymbol = {
                                type: eventType,
                                text: text || '[no text]',
                                rotation,
                                id: v4(),
                                isCarriedBy: [feature]
                            }
                        }
                        else if (eventType === 'cover') {
                            newSymbol = {
                                id: v4(),
                                type: eventType,
                                note: material,
                                isCarriedBy: [feature]
                            }
                        }

                        else if (eventType === 'perforation' && perforationMeaning) {
                            newSymbol = {
                                id: v4(),
                                ...perforationMeaning,
                                isCarriedBy: [feature]
                            }
                        }

                        if (newSymbol) onDone(newSymbol)
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
