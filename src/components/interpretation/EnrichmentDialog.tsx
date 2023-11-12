import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material"

interface EnrichmentDialogProps {
    open: boolean
    onClose: () => void
    onDone: (options: {}) => void
}

export const EnrichmentDialog = ({ open, onDone, onClose }: EnrichmentDialogProps) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Enrichment Options</DialogTitle>
            <DialogContent></DialogContent>
            <DialogActions>
                <Button
                    variant='outlined'
                    color='secondary'
                    onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant='contained'
                    onClick={() => onDone({})}>
                    Perform Enrichment
                </Button>
            </DialogActions>
        </Dialog>
    )
}
