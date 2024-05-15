import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextareaAutosize } from "@mui/material"
import { Certainty, CollatedEvent, Separation } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface SeparateProps {
    open: boolean
    onClose: () => void
    selection: CollatedEvent
    breakPoint: number
    onDone: (separation: Separation) => void
}

export const SeparateDialog = ({ open, onClose, selection, onDone, breakPoint }: SeparateProps) => {
    const [cert, setCert] = useState<Certainty>('unknown')
    const [note, setNote] = useState('')

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Separate</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <div>
                        Separating {selection.id} at {breakPoint}
                    </div>
                    <Select label='Certainty' value={cert} onChange={e => {
                        setCert(e.target.value as Certainty)
                    }}>
                        <MenuItem value='high'>High</MenuItem>
                        <MenuItem value='medium'>Medium</MenuItem>
                        <MenuItem value='low'>Low</MenuItem>
                        <MenuItem value='Unknown'>Unknown</MenuItem>
                    </Select>
                    <TextareaAutosize
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        minRows={4} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => {
                        const originalStart = selection.wasCollatedFrom.reduce((acc, curr) => acc + curr.hasDimension.from, 0) / selection.wasCollatedFrom.length
                        const originalEnd = selection.wasCollatedFrom.reduce((acc, curr) => acc + curr.hasDimension.to, 0) / selection.wasCollatedFrom.length

                        const leftEvent: CollatedEvent = {
                            id: selection.id, // preserve the ID for the left event
                            isNonMusical: selection.isNonMusical,
                            wasCollatedFrom: [structuredClone(selection.wasCollatedFrom[0])]
                        }

                        const virtualLeftEvent = leftEvent.wasCollatedFrom[0]
                        virtualLeftEvent.annotates = undefined
                        virtualLeftEvent.hasDimension.from = originalStart
                        virtualLeftEvent.hasDimension.to = breakPoint
                        virtualLeftEvent.id = v4()

                        const rightEvent: CollatedEvent = {
                            id: v4(),
                            isNonMusical: selection.isNonMusical,
                            wasCollatedFrom: [structuredClone(selection.wasCollatedFrom[0])]
                        }

                        const virtualRightEvent = rightEvent.wasCollatedFrom[0]
                        virtualRightEvent.annotates = undefined
                        virtualRightEvent.hasDimension.from = breakPoint
                        virtualRightEvent.hasDimension.to = originalEnd
                        virtualRightEvent.id = v4()

                        onDone({
                            type: 'separation',
                            id: v4(),
                            separated: selection,
                            into: [leftEvent, rightEvent],
                            carriedOutBy: '',
                            certainty: cert,
                            note
                        })
                        onClose()
                    }}
                    variant='contained'>
                    Save
                </Button>
            </DialogActions>
        </Dialog >
    )
}