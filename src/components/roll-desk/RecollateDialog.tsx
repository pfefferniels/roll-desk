import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from "@mui/material";
import { CollationTolerance } from "linked-rolls";
import { useState } from "react";
import { ToleranceFields } from "./ToleranceFields";

interface RecollateDialogProps {
    /** The tolerance the edition collates with, offered as the starting point. */
    tolerance: CollationTolerance
    onClose: () => void
    onDone: (tolerance: CollationTolerance) => void
}

/** How far apart a selected symbol and an inherited one may lie and still be taken for one. */
export const RecollateDialog = ({ tolerance, onClose, onDone }: RecollateDialogProps) => {
    const [chosen, setChosen] = useState(tolerance)

    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Recollate</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 1 }}>
                    Selected symbols that lie within the tolerance of a symbol inherited
                    from the previous version are taken for that symbol, and their insertion
                    goes. What lies further apart stays an insertion.
                </DialogContentText>
                <Stack spacing={2} sx={{ mt: 2, minWidth: 320 }}>
                    <ToleranceFields value={chosen} onChange={setChosen} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={() => onDone(chosen)}>
                    Recollate
                </Button>
            </DialogActions>
        </Dialog>
    );
}
