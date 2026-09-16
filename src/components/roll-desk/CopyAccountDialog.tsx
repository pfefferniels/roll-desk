import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material"
import { useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { OpenContext } from "../../providers/OpenContext"
import { whichCopy } from "../../helpers/names"
import { CopyAccount } from "./CopyAccount"

interface CopyAccountDialogProps {
    copyId: string
    onClose: () => void
}

/** What is known of a copy, read away from the desk where it has room. */
export const CopyAccountDialog = ({ copyId, onClose }: CopyAccountDialogProps) => {
    const { edition } = useContext(EditionContext)
    const open = useContext(OpenContext)

    const copy = edition?.copies.find(c => c.id === copyId)
    if (!copy) return null

    // What a link in the account opens lies on the desk, which the dialog covers.
    const follow = (id: string) => {
        onClose()
        open(id)
    }

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
            <DialogTitle>Copy {whichCopy(copy)}</DialogTitle>
            <DialogContent dividers>
                <OpenContext.Provider value={follow}>
                    <CopyAccount copyId={copyId} />
                </OpenContext.Provider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}
