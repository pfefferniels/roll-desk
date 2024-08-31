import { Button, Dialog, DialogActions, DialogContent, FormControl, FormLabel, TextField } from "@mui/material"
import { Relation } from "linked-rolls/lib/EditorialActions"
import { useState } from "react"

interface AddNoteProps {
    open: boolean
    selection: Relation[]
    onDone: (relations: Relation[]) => void
}

export const AddNote = ({ selection, onDone, open }: AddNoteProps) => {
    const [note, setNote] = useState('')

    return (
        <Dialog open={open} onClose={() => onDone([])}>
            <DialogContent>
                <FormControl>
                    <FormLabel>Note</FormLabel>
                    <TextField
                        variant='filled'
                        size='small'
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        minRows={4} />
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        const updatedSelection = [...selection]
                        for (const relation of updatedSelection) {
                            relation.note = note
                        }
                        onDone(updatedSelection)
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
