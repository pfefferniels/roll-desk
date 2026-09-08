import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { CollationTolerance, Version } from "linked-rolls";
import { useState } from "react";
import { ToleranceFields } from "./ToleranceFields";

interface AttachToDialogProps {
    /** The version to be declared derivative of another. */
    currentVersionId: string
    versions: Version[]
    /** The tolerance offered as the starting point, kept on the derivation once attached. */
    tolerance: CollationTolerance
    onClose: () => void
    onDone: (parentVersionId: string, tolerance: CollationTolerance) => void
}

/**
 * Which version the current one derives from, and how far apart two
 * symbols may lie and still be taken for the same one.
 */
export const AttachToDialog = ({ currentVersionId, versions, tolerance, onClose, onDone }: AttachToDialogProps) => {
    const candidates = versions.filter(version => version.id !== currentVersionId)
    const [parentVersionId, setParentVersionId] = useState(candidates[0]?.id ?? '')
    const [chosen, setChosen] = useState(tolerance)

    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Attach To</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 1 }}>
                    Symbols of both versions that lie within the tolerance are taken
                    for the same symbol. What is left over becomes an insertion or a deletion.
                </DialogContentText>
                <Stack spacing={2} sx={{ mt: 2, minWidth: 320 }}>
                    <TextField
                        label='Based On'
                        select
                        fullWidth
                        value={parentVersionId}
                        onChange={event => setParentVersionId(event.target.value)}
                    >
                        {candidates.map(version => (
                            <MenuItem key={version.id} value={version.id}>
                                {version.siglum}
                            </MenuItem>
                        ))}
                    </TextField>
                    <ToleranceFields value={chosen} onChange={setChosen} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    disabled={!parentVersionId}
                    onClick={() => onDone(parentVersionId, chosen)}
                >
                    Attach
                </Button>
            </DialogActions>
        </Dialog>
    );
}
