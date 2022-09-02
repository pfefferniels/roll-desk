import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material"
import { FC } from "react"
import { AbstractTransformer, TransformationOptions } from "../lib/transformers/Transformer"

interface EditPipelineProps {
    pipeline?: AbstractTransformer<TransformationOptions>[]
    dialogOpen: boolean,
    setDialogOpen: (open: boolean) => void
}

export const EditPipeline: FC<EditPipelineProps> = ({ pipeline, dialogOpen, setDialogOpen }): JSX.Element => {
    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Edit Interpolation Pipeline</DialogTitle>
            <DialogContent>
                <div>
                    {pipeline?.map(transformer => {
                        return (
                            <div>
                                <span>{transformer.name()}</span>
                                <Button>Edit Options</Button>
                            </div>
                        )
                    })}
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    setDialogOpen(false)
                }}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}
