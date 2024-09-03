import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select } from "@mui/material"
import { Edition } from "linked-rolls"
import { useState } from "react"

interface EmulationSettingsDialogProps {
    open: boolean
    edition: Edition
    onClose: () => void
    onDone: (primaryCopy: string) => void
}

export const EmulationSettingsDialog = ({ open, edition, onClose, onDone }: EmulationSettingsDialogProps) => {
    const [currentCopy, setCurrentCopy] = useState('')

    return (
        <Dialog open={open} onClose={onDone}>
            <DialogTitle>
                Emulation Settings
            </DialogTitle>
            <DialogContent>
                <FormControl>
                    <FormLabel>Primary Source</FormLabel>
                    <Select value={currentCopy} size='small' onChange={e => setCurrentCopy(e.target.value)}>
                        {edition.copies.map(copy => (
                            <MenuItem key={copy.id} value={copy.id}>
                                {copy.productionEvent.date || copy.id}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        onDone(currentCopy)
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
