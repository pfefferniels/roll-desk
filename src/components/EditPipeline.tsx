import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material"
import { FC } from "react"

interface EditPipelineProps {
    dialogOpen: boolean,
    setDialogOpen: (open: boolean) => void
}

export const EditPipeline: FC<EditPipelineProps> = ({ dialogOpen, setDialogOpen }): JSX.Element => {
    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Edit Interpolation Pipeline</DialogTitle>
            <DialogContent>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    setDialogOpen(false)
                }}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}
