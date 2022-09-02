import { AddOutlined, ClearOutlined, EditOutlined, PlusOneOutlined } from "@mui/icons-material"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Slider, Stack, IconButton, List, ListItem, ListItemText } from "@mui/material"
import { Box } from "@mui/system"
import { FC, useState } from "react"
import { AbstractTransformer, TransformationOptions } from "../lib/transformers/Transformer"

interface EditPipelineProps {
    pipeline?: AbstractTransformer<TransformationOptions>[]
    onReady: () => void,
    dialogOpen: boolean,
}

export const EditPipeline: FC<EditPipelineProps> = ({ pipeline, dialogOpen, onReady }): JSX.Element => {
    const [_, setTransformations] = useState(pipeline)

    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Edit Interpolation Pipeline</DialogTitle>
            <DialogContent>
                <List sx={{ height: 400, width: 500, m: 2 }}>
                    {pipeline?.map((transformer, i) => {
                        return (
                            <ListItem
                                secondaryAction={
                                    <>
                                        <IconButton>
                                            <EditOutlined />
                                        </IconButton>
                                        <IconButton onClick={() => {
                                            setTransformations(pipeline.splice(i, 1))
                                        }}>
                                            <ClearOutlined />
                                        </IconButton>
                                    </>
                                }>
                                <ListItemText>{transformer.name()}</ListItemText>
                            </ListItem>
                        )
                    })}
                </List>
                <IconButton>
                    <AddOutlined />
                </IconButton>
            </DialogContent>
            <DialogActions>
                <Button onClick={onReady}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}
