import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { Certainty, Conjecture } from "linked-rolls/lib/EditorialActions"
import { AnyRollEvent } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface UnifyProps {
    open: boolean
    onClose: () => void
    selection: AnyRollEvent[]
    clearSelection: () => void
    onDone: (conjecture: Conjecture) => void
}

export const UnifyDialog = ({ open, onClose, selection, clearSelection, onDone }: UnifyProps) => {
    const [cert, setCert] = useState<Certainty>('unknown')
    const [note, setNote] = useState('')

    if (selection.length === 0) return null

    const froms = selection.map(e => e.hasDimension.horizontal.from)
    const tos = selection.map(e => e.hasDimension.horizontal.to).filter(to => to !== undefined)

    const minFrom = Math.min(...froms)
    const maxTo = Math.max(...tos)

    const unit = selection[0].hasDimension.horizontal.hasUnit

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Unify</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <div>
                        Unifying <b>{selection.length}</b> events{' '}
                        from {minFrom.toFixed(0)}{unit}{' '}
                        to {maxTo.toFixed(0)}{unit}
                    </div>
                    <FormControl>
                        <FormLabel>Certainty</FormLabel>
                        <Select
                            size='small'
                            label='Certainty'
                            value={cert}
                            onChange={e => {
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
                            size='small'
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            minRows={4} />
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    variant='outlined'
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => {
                        const copy = structuredClone(selection[0])
                        copy.id = v4()
                        copy.hasDimension.horizontal.from = minFrom
                        copy.hasDimension.horizontal.to = maxTo
                        copy.annotates = undefined

                        onDone({
                            type: 'conjecture',
                            id: v4(),
                            replaced: selection,
                            with: [copy],
                            carriedOutBy: '#np',
                            certainty: cert,
                            note
                        })
                        clearSelection()
                        onClose()
                    }}
                    variant='contained'
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}