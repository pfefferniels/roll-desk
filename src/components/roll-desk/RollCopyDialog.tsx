import { Delete, MusicNote } from "@mui/icons-material";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, IconButton, Divider, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { readFromSpencerMIDI, readFromStanfordAton, RollCopy } from "linked-rolls";

interface RollCopyDialogProps {
    open: boolean
    copy?: RollCopy
    onClose: () => void
    onDone: (rollCopy: RollCopy) => void
    onRemove: (rollCopy: RollCopy) => void
}

export const RollCopyDialog = ({ open, copy, onClose, onDone, onRemove }: RollCopyDialogProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [location, setLocation] = useState('') // P55 has current location

    useEffect(() => {
        if (!copy) return
        setLocation(copy.location)
    }, [copy])

    const handleUpload = async () => {
        if (!file) {
            console.log('No file uploaded yet');
            return;
        }

        let rollCopy = copy || new RollCopy()

        if (file) {
            if (file.name.endsWith('midi') || file.name.endsWith('mid')) {
                rollCopy = readFromSpencerMIDI(await file.arrayBuffer());
            }
            else if (file.name.endsWith('txt')) {
                rollCopy = readFromStanfordAton(await file.text(), true);
            }
        }

        rollCopy.location = location
        onDone(rollCopy);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Stack>
                    <Typography>Physical Location</Typography>
                    <TextField
                        size='small'
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder='e. g. Stanford University Archive'
                        label='Physical location'
                    />
                    <Divider flexItem />
                    <Button variant="outlined" component="label" startIcon={<MusicNote />}>
                        {file ? file.name : 'Upload Roll Analysis'}
                        <input
                            type="file"
                            hidden
                            accept=".txt,.mid,.midi"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={async () => {
                        handleUpload();
                        onClose();
                    }}
                >
                    Save
                </Button>
                <IconButton color='secondary' onClick={() => {
                    if (copy) {
                        onRemove(copy)
                        onClose()
                    }
                }}>
                    <Delete />
                </IconButton>
            </DialogActions>
        </Dialog >
    );
};
