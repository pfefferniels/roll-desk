import { Thing } from "@inrupt/solid-client"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material"

interface AnalysisDialogProps {
    interpretation?: Thing
    open: boolean
    onClose: () => void
}

export const AnalysisDialog = ({ open, onClose }: AnalysisDialogProps) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Create/Edit Interpretation
            </DialogTitle>
            <DialogContent>
                Notes
                <TextField placeholder="Notes/Details/... on this interpretation" />
            </DialogContent>
            <DialogActions>
                <Button>Save</Button>
            </DialogActions>
        </Dialog>
    )
}