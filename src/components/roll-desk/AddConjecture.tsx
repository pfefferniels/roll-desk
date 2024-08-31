import { Button, Divider, Drawer, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { Certainty, RollCopy } from "linked-rolls"
import { AnyRollEvent } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface AddConjectureProps {
    selection: AnyRollEvent[]
    copy: RollCopy
    open: boolean
    onClose: () => void
    clearSelection: () => void
}

export const AddConjecture = ({ selection, copy, open, onClose, clearSelection }: AddConjectureProps) => {
    const [original, setOriginal] = useState<AnyRollEvent[]>([])
    const [correction, setCorrection] = useState<AnyRollEvent[]>([])
    const [cert, setCert] = useState<Certainty>('unknown')
    const [note, setNote] = useState('')

    const handleInsert = () => {
        // these events will live now inside the conjecture
        for (const event of correction) {
            copy.removeEvent(event.id)
        }

        copy.applyActions([
            {
                type: 'conjecture',
                carriedOutBy: '#np',
                certainty: cert,
                replaced: original,
                with: correction,
                note: note.length === 0 ? undefined : note,
                id: v4()
            }
        ])
    }

    const markOriginal = () => {
        setOriginal(selection)
        clearSelection()
    }

    const markCorrection = () => {
        setCorrection(selection)
        clearSelection()
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            variant='persistent'
            anchor='left'
        >
            <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                <div>
                    Original: {original.length}<br />
                    Correction: {correction.length}
                </div>

                <Button variant='contained' onClick={markOriginal}>
                    Mark Original ({selection.length})
                </Button>
                <Button variant='contained' onClick={markCorrection}>
                    Mark Correction ({selection.length})
                </Button>

                <FormControl>
                    <FormLabel>Certainty</FormLabel>
                    <Select size='small' value={cert} onChange={e => {
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
                <Divider orientation='horizontal' />
                <Stack direction='row' spacing={2}>
                    <Button
                        variant='contained'
                        onClick={() => {
                            handleInsert()
                            onClose()
                        }}
                    >
                        Done
                    </Button>
                    <Button
                    variant="outlined"
                    onClick={onClose}
                    >
                        Cancel
                    </Button>
                </Stack>
            </Stack>
        </Drawer>
    )
}
