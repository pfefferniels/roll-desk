import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material"
import { RollCopy } from "linked-rolls"
import { useState } from "react"
import { v4 } from "uuid"

interface AddHandDialogProps {
    open: boolean
    copy: RollCopy
    onDone: (changedCopy?: RollCopy) => void
}

export const AddHandDialog = ({ copy, onDone, open }: AddHandDialogProps) => {
    const [name, setName] = useState('')
    const [date, setDate] = useState('')
    const [desc, setDesc] = useState('')

    const handleDone = () => {
        copy.addManualEditing({
            carriedOutBy: name,
            hasModified: copy.physicalItem,
            hasTimeSpan: {
                id: v4(),
                atSomeTimeWithin: date
            },
            'id': v4(),
            note: desc
        })

        onDone(copy.clone())
    }

    const handleClose = () => onDone(copy)

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Add Editing Layer (Hand)</DialogTitle>
            <DialogContent>
                <Stack direction='column' spacing={1}>
                    <TextField
                        variant='filled'
                        size='small'
                        value={name}
                        label='Name'
                        placeholder="Type name of the hand"
                        onChange={(e) => setName(e.target.value)}
                    />
                    <TextField
                        variant='filled'
                        size='small'
                        value={date}
                        label='Date'
                        placeholder="(Presumed) date of the editing"
                        onChange={(e) => setDate(e.target.value)}
                    />
                    <TextField
                        variant='filled'
                        size='small'
                        value={desc}
                        label='Description'
                        placeholder="Hand description ..."
                        onChange={e => setDesc(e.target.value)}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant='contained' onClick={handleDone}>
                    Add
                </Button>
                <Button variant='outlined' onClick={handleClose}>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    )
}
