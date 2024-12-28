import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, Stack } from "@mui/material"
import { useEffect, useState } from "react"
import { EditGroup } from "linked-rolls/lib/EditorialActions";

interface EditLabelProps {
    open: boolean
    onClose: () => void
    selection: EditGroup[]
    clearSelection: () => void
}

export const EditLabelDialog = ({ open, onClose, selection, clearSelection }: EditLabelProps) => {
    const [label, setLabel] = useState<'insert' | 'delete' | 'multiple' | 'none'>('none')

    useEffect(() => {
        const uniqueActions = new Set(selection.map(s => s.action));
        if (uniqueActions.size === 1) {
            const singleAction = [...uniqueActions][0] || 'none';
            setLabel(singleAction || 'none' as 'insert' | 'delete' | 'none');
        } else {
            setLabel('multiple');
        }
    }, [selection])

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Edit Group Label</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <FormControl>
                        <FormLabel>Label</FormLabel>
                        <Select label='Label' value={label} onChange={e => {
                            setLabel(e.target.value as 'insert' | 'delete' | 'none')
                        }}>
                            <MenuItem disabled={true} value='multiple'><i>Multiple</i></MenuItem>
                            <MenuItem value='insert'>Insertion</MenuItem>
                            <MenuItem value='delete'>Deletion</MenuItem>
                            <MenuItem value='none'>Unknown</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => {
                        if (label !== 'multiple') {
                            selection.forEach(group => group.action = label === 'none' ? undefined : label)
                        }

                        clearSelection()
                        onClose()
                    }}
                    variant='contained'
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog >
    )
}
