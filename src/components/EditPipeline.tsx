import { AddOutlined, CheckOutlined, ClearOutlined, EditOutlined } from "@mui/icons-material"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, List, ListItem, ListItemText, TextField } from "@mui/material"
import { FC, useState } from "react"
import { InterpolatePhysicalOrnamentationOptions } from "../lib/transformers"
import { AbstractTransformer, TransformationOptions } from "../lib/transformers/Transformer"

interface EditPipelineProps {
    pipeline?: AbstractTransformer<TransformationOptions>[]
    onReady: () => void,
    dialogOpen: boolean,
}

interface SetOptionsProp<T extends TransformationOptions> {
    setOptions: (options: T) => void
}

const PhysicalOrnamentationOptions: FC<SetOptionsProp<InterpolatePhysicalOrnamentationOptions>> = ({ setOptions }) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(2)

    return (
        <div>
            <TextField
                label='Minimum arpeggio size'
                size='small'
                value={minimumArpeggioSize}
                onChange={(e) => {
                    setMinimumArpeggioSize(+e.target.value)
                    setOptions({
                        minimumArpeggioSize
                    })
                }}
                type='number' />
        </div>
    )
}

export const EditPipeline: FC<EditPipelineProps> = ({ pipeline, dialogOpen, onReady }): JSX.Element => {
    const [_, setTransformations] = useState(pipeline)
    const [displayOptions, setDisplayOptions] = useState('')

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
                                        {displayOptions === transformer.name() ?
                                            <IconButton onClick={() => {
                                                setDisplayOptions('')
                                            }}>
                                                <CheckOutlined />
                                            </IconButton> :
                                            <IconButton onClick={() => {
                                                setDisplayOptions(transformer.name())
                                            }}>
                                                <EditOutlined />
                                            </IconButton>
                                        }

                                        <IconButton onClick={() => {
                                            setTransformations(pipeline.splice(i, 1))
                                        }}>
                                            <ClearOutlined />
                                        </IconButton>
                                    </>
                                }>
                                <ListItemText
                                    primary={transformer.name()}
                                    secondary={
                                        displayOptions === transformer.name() && (
                                            {
                                                'InterpolatePhysicalOrnamentation': 
                                                    <PhysicalOrnamentationOptions setOptions={options => {
                                                        transformer.setOptions(options)
                                                    }} />
                                            }[transformer.name()] || <div>not yet implemented</div>)
                                    } />
                            </ListItem>
                        )
                    })}
                </List>
                <IconButton>
                    <AddOutlined />
                </IconButton>
            </DialogContent >
            <DialogActions>
                <Button onClick={onReady}>Save</Button>
            </DialogActions>
        </Dialog >
    )
}
