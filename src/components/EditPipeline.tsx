import { AddOutlined, ArrowDownwardOutlined, CheckOutlined, ClearOutlined, EditOutlined, TransformOutlined } from "@mui/icons-material"
import { Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, List, ListItem, ListItemText, TextField, ListItemAvatar, Select, MenuItem, Stack } from "@mui/material"
import { FC, useState } from "react"
import { beatLengthBasis, BeatLengthBasis, InterpolatePhysicalOrnamentationOptions, InterpolateTempoMapOptions } from "../lib/transformers"
import { AbstractTransformer, TransformationOptions } from "../lib/transformers/Transformer"

interface OptionsProp<T extends TransformationOptions> {
    options?: T
    setOptions: (options: T) => void
}

const PhysicalOrnamentationOptions: FC<OptionsProp<InterpolatePhysicalOrnamentationOptions>> = ({ options, setOptions }) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(options?.minimumArpeggioSize || 2)

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

const TempoOptions: FC<OptionsProp<InterpolateTempoMapOptions>> = ({ options, setOptions }) => {
    const [beatLength, setBeatLength] = useState<BeatLengthBasis>(options?.beatLength || 'denominator')
    const [epsilon, setEpsilon] = useState(options?.epsilon || 4)

    return (
        <div>
            <Select
                value={beatLength}
                onChange={e => {
                    setBeatLength(e.target.value as BeatLengthBasis)
                    setOptions({ beatLength, epsilon })
                }}>
                {beatLengthBasis.map(basis => {
                    return (
                        <MenuItem value={basis}>{basis}</MenuItem>
                    )
                })}
            </Select>
            <TextField
                label='Epsilon'
                value={epsilon}
                onChange={e => {
                    setEpsilon(+e.target.value)
                    setOptions({ beatLength, epsilon })
                }}
                type='number' />
        </div>
    )
}

interface EditPipelineProps {
    pipeline?: AbstractTransformer<TransformationOptions>[]
    onReady: () => void,
    dialogOpen: boolean,
}

export const EditPipeline: FC<EditPipelineProps> = ({ pipeline, dialogOpen, onReady }): JSX.Element => {
    const [_, setTransformations] = useState(pipeline)
    const [displayOptions, setDisplayOptions] = useState('')

    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Edit Interpolation Pipeline</DialogTitle>
            <DialogContent>
                <Stack>
                    <List sx={{ minWidth: '1000', m: 2}}>
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
                                    <ListItemAvatar>
                                        <Avatar>
                                            <ArrowDownwardOutlined />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={transformer.name()}
                                        secondary={
                                            displayOptions === transformer.name() && (
                                                {
                                                    'InterpolatePhysicalOrnamentation':
                                                        <PhysicalOrnamentationOptions
                                                            options={transformer.options as InterpolatePhysicalOrnamentationOptions}
                                                            setOptions={options => transformer.setOptions(options)} />,
                                                    'InterpolateTempoMap':
                                                        <TempoOptions
                                                            options={transformer.options as InterpolateTempoMapOptions}
                                                            setOptions={options => transformer.setOptions(options)} />
                                                }[transformer.name()] || <div>no options for this transformer</div>)
                                        } />
                                </ListItem>
                            )
                        })}
                    </List>
                    <IconButton>
                        <AddOutlined />
                    </IconButton>
                    <Button>
                        Reset
                    </Button>
                </Stack>
            </DialogContent >
            <DialogActions>
                <Button onClick={onReady}>Save</Button>
            </DialogActions>
        </Dialog >
    )
}
