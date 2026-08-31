import { Delete, MusicNote } from "@mui/icons-material";
import { Alert, Button, CircularProgress, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, IconButton, Divider, Stack } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { CreateVersion, readFromSpencerMIDI, readFromStanfordAton, RollCopy } from "linked-rolls";
import { EditionContext } from "../../providers/EditionContext";
import { v4 } from "uuid";

interface RollCopyDialogProps {
    open: boolean
    copy?: RollCopy
    onClose: () => void
    onDone?: (copyId: string) => void
}

export const RollCopyDialog = ({ open, copy, onClose, onDone }: RollCopyDialogProps) => {
    const { edition, apply } = useContext(EditionContext)
    const [file, setFile] = useState<File | null>(null);
    const [location, setLocation] = useState('')
    const [siglum, setSiglum] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()

    useEffect(() => {
        if (!copy) return
        setLocation(copy.location)
    }, [copy])

    useEffect(() => {
        if (!open) {
            setFile(null)
            setLocation(copy?.location ?? '')
            setSiglum('')
            setError(undefined)
            setLoading(false)
        }
    }, [open, copy])

    const handleUpload = async () => {
        if (!edition) return

        if (!file) {
            setError('Please select a file to upload.')
            return
        }

        setError(undefined)
        setLoading(true)

        try {
            let rollCopy: RollCopy = copy || {
                ops: [],
                type: 'RollCopy',
                id: v4(),
                measurements: {},
                conditions: [],
                location: '',
                modifications: [],
                features: [],
            }

            if (file.name.endsWith('midi') || file.name.endsWith('mid')) {
                rollCopy = readFromSpencerMIDI(await file.arrayBuffer());
            }
            else if (file.name.endsWith('txt')) {
                rollCopy = readFromStanfordAton(await file.text());
            }

            rollCopy.location = location

            apply(new CreateVersion(siglum, rollCopy))
            onDone?.(rollCopy.id)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to parse the uploaded file.')
        } finally {
            setLoading(false)
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    {error && <Alert severity="error">{error}</Alert>}

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
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button
                    variant='contained'
                    disabled={loading}
                    onClick={handleUpload}
                    startIcon={loading ? <CircularProgress size={16} /> : undefined}
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
