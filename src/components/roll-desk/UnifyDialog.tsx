import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { AnyRollEvent, Certainty, Unification } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface UnifyProps {
    open: boolean
    onClose: () => void
    selection: AnyRollEvent[]
    clearSelection: () => void
    onDone: (unification: Unification) => void
}

export const UnifyDialog = ({ open, onClose, selection, clearSelection, onDone }: UnifyProps) => {
    const [cert, setCert] = useState<Certainty>('unknown')
    const [note, setNote] = useState('')

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Unify</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <div>
                        Unifying
                        <ul>
                            {selection.map((e, i) => <li key={`unifyDialog${i}`}>{e.id}</li>)}
                        </ul>
                    </div>
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
                        onDone({
                            type: 'unification',
                            id: v4(),
                            unified: selection,
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
        </Dialog>
    )
}