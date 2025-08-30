import { Delete, MusicNote } from "@mui/icons-material";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, IconButton, Divider, Stack } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { asSymbols, fillEdits, readFromSpencerMIDI, readFromStanfordAton, RollCopy, Version } from "linked-rolls";
import { EditionContext } from "../../providers/EditionContext";
import { v4 } from "uuid";

interface RollCopyDialogProps {
    open: boolean
    copy?: RollCopy
    onClose: () => void
}

export const RollCopyDialog = ({ open, copy, onClose }: RollCopyDialogProps) => {
    const { edition, apply } = useContext(EditionContext)
    const [file, setFile] = useState<File | null>(null);
    const [location, setLocation] = useState('') // P55 has current location
    const [siglum, setSiglum] = useState('')

    useEffect(() => {
        if (!copy) return
        setLocation(copy.location)
    }, [copy])

    const handleUpload = async () => {
        if (!edition) return

        if (!file) {
            console.log('No file uploaded yet');
            return;
        }

        let rollCopy: RollCopy = copy || {
            ops: new Set(),
            type: 'RollCopy',
            id: v4(),
            features: [],
            measurements: {},
            conditions: [],
            location: '',
        }

        if (file) {
            if (file.name.endsWith('midi') || file.name.endsWith('mid')) {
                rollCopy = readFromSpencerMIDI(await file.arrayBuffer());
            }
            else if (file.name.endsWith('txt')) {
                rollCopy = readFromStanfordAton(await file.text(), true);
            }
        }

        rollCopy.location = location

        const newVersion: Version = {
            siglum,
            id: v4(),
            edits: [],
            motivations: [],
            type: 'edition'
        }

        newVersion.edits = fillEdits(newVersion, asSymbols(rollCopy.features), { toleranceStart: 3, toleranceEnd: 3 })

        apply(d => {
            d.copies.push(rollCopy)
            d.versions.push(newVersion)
        })
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    <Typography>Physical Location</Typography>
                    <TextField
                        size='small'
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder='e. g. Stanford University Archive'
                        label='Physical location'
                    />

                    <Typography>(Preliminary) Siglum</Typography>
                    <TextField
                        size='small'
                        value={siglum}
                        onChange={e => setSiglum(e.target.value)}
                        placeholder='e. g. B1'
                        label='Siglum'
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
                    if (!copy) return
                    apply(draft => {
                        draft.copies.splice(draft.copies.indexOf(copy), 1)
                    })
                }}>
                    <Delete />
                </IconButton>
            </DialogActions>
        </Dialog >
    );
};
