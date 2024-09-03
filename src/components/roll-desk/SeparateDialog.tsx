import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { Unstable_NumberInput as NumberInput } from '@mui/base/Unstable_NumberInput';
import { AnyRollEvent } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"
import { Certainty, Conjecture } from "linked-rolls/lib/EditorialActions";

interface SeparateProps {
    open: boolean
    onClose: () => void
    selection: AnyRollEvent
    clearSelection: () => void
    breakPoint: number
    onDone: (separation: Conjecture) => void
}

export const SeparateDialog = ({ open, onClose, selection, clearSelection, onDone, breakPoint }: SeparateProps) => {
    const [gap, setGap] = useState<number>()
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
                    <FormControl>
                        <FormLabel>
                            Gap (in {selection.hasDimension.horizontal.hasUnit || 'mm'})
                        </FormLabel>
                        <NumberInput
                            min={1}
                            max={10}
                            value={gap}
                            onChange={(_, value) => setGap(value)} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Certainty</FormLabel>
                        <Select label='Certainty' value={cert} onChange={e => {
                            setCert(e.target.value as Certainty)
                        }}>
                            <MenuItem value='high'>High</MenuItem>
                            <MenuItem value='medium'>Medium</MenuItem>
                            <MenuItem value='low'>Low</MenuItem>
                            <MenuItem value='Unknown'>Unknown</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl>
                        <FormLabel>Note</FormLabel>
                        <TextField
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            minRows={4} />
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => {
                        const originalStart = selection.hasDimension.horizontal.from
                        const originalEnd = selection.hasDimension.horizontal.to

                        const leftEvent = structuredClone(selection)
                        leftEvent.annotates = undefined
                        leftEvent.hasDimension.horizontal.from = originalStart
                        leftEvent.hasDimension.horizontal.to = breakPoint - (gap || 0) / 2
                        leftEvent.id = v4()

                        const rightEvent = structuredClone(selection)
                        rightEvent.annotates = undefined
                        rightEvent.hasDimension.horizontal.from = breakPoint + (gap || 0) / 2
                        rightEvent.hasDimension.horizontal.to = originalEnd
                        rightEvent.id = v4()

                        onDone({
                            type: 'conjecture',
                            id: v4(),
                            replaced: [selection],
                            with: [leftEvent, rightEvent],
                            carriedOutBy: '',
                            certainty: cert,
                            note
                        })
                        clearSelection()
                        onClose()
                    }}
                    variant='contained'>
                    Save
                </Button>
            </DialogActions>
        </Dialog >
    )
}
