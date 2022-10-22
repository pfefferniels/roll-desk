import { AddOutlined, CheckOutlined, ClearOutlined, EditOutlined } from "@mui/icons-material"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, List, ListItem, ListItemText, Stack } from "@mui/material"
import { FC, useState } from "react"
import { Interpolator } from "../../../lib/Interpolation"
import { InterpolatePhysicalOrnamentationOptions, InterpolateTempoMapOptions, Pipeline } from "../../../lib/transformers"
// import { AbstractTransformer, TransformationOptions } from "../../../lib/transformers/Transformer"
import { PhysicalOrnamentationOptions } from "./options/PhysicalOrnamentationOptions"
import { TempoOptions } from "./options/TempoOptions"

interface PipelineEditorProps {
    pipeline: Pipeline
    onReady: () => void,
    dialogOpen: boolean,
}

export const PipelineEditor: FC<PipelineEditorProps> = ({ pipeline, dialogOpen, onReady }): JSX.Element => {
    // const [transformations, setTransformations] = useState(pipeline)
    // const [displayOptions, setDisplayOptions] = useState('')

    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Pipeline Editor</DialogTitle>
            <DialogContent>
                length = {pipeline.length}
            </DialogContent >
            <DialogActions>
                <Button onClick={onReady}>Save</Button>
            </DialogActions>
        </Dialog >
    )
}
