import { MusicNote } from "@mui/icons-material";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, Stack, TextField, Typography, Select, MenuItem, Divider } from "@mui/material";
import { useState } from "react";
import { RollCopy } from "linked-rolls";

interface RollCopyDialogProps {
    open: boolean
    onClose: () => void
    onDone: (rollCopy: RollCopy) => void
}

/**
 * Attaches the physical copy as an item to its
 * expressions and creates an expression if none
 * exists yet.
 */
export const RollCopyDialog = ({ open, onClose, onDone }: RollCopyDialogProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [type, setType] = useState<'welte-red' | 'welte-green'>('welte-red')
    const [catalogueNumber, setCatalogueNumber] = useState('')
    const [rollDate, setRollDate] = useState('')

    const handleUpload = async () => {
        if (!file) {
            console.log('No file uploaded yet')
            return
        }

        const rollCopy = new RollCopy()
        rollCopy.physicalItem.hasType = type
        rollCopy.physicalItem.rollDate = rollDate
        rollCopy.physicalItem.catalogueNumber = catalogueNumber
        rollCopy.readFromStanfordAton(await file?.text(), true)
        onDone(rollCopy)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Stack spacing={2} p={1}>
                    <Typography>Physical Description</Typography>
                    <Select
                        size='small'
                        value={type}
                        onChange={(e) => setType(e.target.value as 'welte-red' | 'welte-green')}>
                        <MenuItem value='welte-red'>Welte red (100)</MenuItem>
                        <MenuItem value='welte-green'>Welte green</MenuItem>
                    </Select>
                    <TextField
                        size='small'
                        label='Catalogue Number'
                        value={catalogueNumber}
                        onChange={e => setCatalogueNumber(e.target.value)} />
                    <TextField
                        size='small'
                        label='Roll Date'
                        value={rollDate}
                        onChange={e => setRollDate(e.target.value)} />
                    <Divider flexItem />
                    <Button variant="contained" component="label" startIcon={< MusicNote />}>
                        Upload Roll Analysis
                        <input
                            type="file"
                            hidden
                            accept=".txt"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={async () => {
                    handleUpload()
                    onClose()
                }}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}

