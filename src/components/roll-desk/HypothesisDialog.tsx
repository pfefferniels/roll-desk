import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Stack, TextField } from "@mui/material"
import { certainties, Certainty, Version } from "linked-rolls"
import { useState } from "react"

interface HypothesisDialogProps {
    /** The version a further derivation is stated for. */
    currentVersionId: string
    /** The versions it may be held to derive from. */
    versions: Version[]
    onClose: () => void
    onDone: (parentVersionId: string, certainty: Certainty) => void
}

/**
 * States that the current version may also derive from another, as in a
 * contamination, and how certainly. Nothing is collated: the text stays
 * read against the derivation it has, unless this one is held more certain.
 */
export const HypothesisDialog = ({ currentVersionId, versions, onClose, onDone }: HypothesisDialogProps) => {
    const candidates = versions.filter(version => version.id !== currentVersionId)
    const [parentVersionId, setParentVersionId] = useState(candidates[0]?.id ?? '')
    const [certainty, setCertainty] = useState<Certainty>('possible')

    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Hypothesis of Derivation</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 1 }}>
                    The reasons for the belief can be added once it is stated.
                </DialogContentText>
                <Stack spacing={2} sx={{ mt: 2, minWidth: 320 }}>
                    <TextField
                        label='Derived From'
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
                    <TextField
                        label='Held To Be'
                        select
                        fullWidth
                        value={certainty}
                        onChange={event => setCertainty(event.target.value as Certainty)}
                    >
                        {certainties.map(value => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    disabled={!parentVersionId}
                    onClick={() => onDone(parentVersionId, certainty)}
                >
                    State
                </Button>
            </DialogActions>
        </Dialog>
    )
}
