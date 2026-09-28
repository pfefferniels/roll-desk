import { CheckRounded } from "@mui/icons-material"
import { Autocomplete, Box, Dialog, DialogContent, IconButton, Stack, TextField } from "@mui/material"
import { Motivation } from "linked-rolls"
import { useEffect, useState } from "react"

interface MotivateDialogProps {
    open: boolean
    /** The motivations already defined in the version. */
    motivations: readonly Motivation[]
    /** The motivation the selected edits share, if any. */
    value?: Motivation
    /** An existing motivation to reuse, or the note of a new one. */
    onDone: (motivation: Motivation | string) => void
    onClose: () => void
}

export const MotivateDialog = ({ open, motivations, value, onDone, onClose }: MotivateDialogProps) => {
    const [chosen, setChosen] = useState<Motivation | null>(value ?? null)
    const [note, setNote] = useState(value?.note ?? '')

    useEffect(() => {
        setChosen(value ?? null)
        setNote(value?.note ?? '')
    }, [value, open])

    const trimmedNote = note.trim()

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth='xs'>
            <DialogContent>
                <Stack direction='row'>
                    <Autocomplete
                        freeSolo
                        disablePortal
                        fullWidth
                        size='small'
                        options={motivations}
                        value={chosen}
                        inputValue={note}
                        getOptionLabel={option => (typeof option === 'string' ? option : option.note) ?? ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, option) => setChosen(typeof option === 'string' ? null : option)}
                        onInputChange={(_, input) => setNote(input)}
                        renderInput={params => (
                            <TextField
                                {...params}
                                autoFocus
                                margin='dense'
                                variant='outlined'
                                placeholder='Reason for the edit'
                            />
                        )}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            disabled={!trimmedNote}
                            onClick={() => onDone(chosen?.note === trimmedNote ? chosen : trimmedNote)}
                        >
                            <CheckRounded />
                        </IconButton>
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    )
}
