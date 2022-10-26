import { AddOutlined, CheckOutlined, ClearOutlined, EditOutlined } from "@mui/icons-material"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, List, ListItem, ListItemText, Stack, ToggleButtonGroup, ToggleButton } from "@mui/material"
import { FC, useState } from "react"
import { InterpolateArticulationOptions, InterpolatePhysicalOrnamentationOptions, InterpolateTempoMapOptions, Pipeline, PipelineName } from "../../../lib/transformers"
import { ArticulationOptions } from "./options/ArticulationOptions"
import { PhysicalOrnamentationOptions } from "./options/PhysicalOrnamentationOptions"
import { TempoOptions } from "./options/TempoOptions"

interface PipelineEditorProps {
    pipeline: Pipeline
    changePipelinePreset: (name: PipelineName) => void
    onReady: () => void,
    dialogOpen: boolean,
}

export const PipelineEditor: FC<PipelineEditorProps> = ({ pipeline, changePipelinePreset, dialogOpen, onReady }): JSX.Element => {
    const [showDetails, setShowDetails] = useState('')
    const [presetPipeline, setPresetPipeline] = useState<PipelineName>('chordal-texture')

    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Pipeline Editor</DialogTitle>
            <DialogContent>
                <Stack>
                    <ToggleButtonGroup
                        value={presetPipeline}
                        exclusive
                        onChange={(e, newTexture) => {
                            setPresetPipeline(newTexture as PipelineName)
                            changePipelinePreset(newTexture as PipelineName)
                        }}
                        aria-label="pipeline preset">
                        <ToggleButton value="chordal-texture" aria-label="chordal texture">
                            chordal
                        </ToggleButton>
                        <ToggleButton value="melodic-texture" aria-label="melodic texture">
                            melodic
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <List sx={{ minWidth: '1000', m: 2 }}>
                        {pipeline.map((transformer, i) => {
                            return (
                                <ListItem
                                    key={`transformer_${i}`}
                                    sx={{
                                        marginBottom: '2rem',
                                        display: 'block',
                                        border: '1px solid black',
                                        width: '400px',
                                        '&::before': {
                                            position: 'absolute',
                                            content: '"followed by"',
                                            color: 'gray',
                                            fontStyle: 'italic',
                                            textAlign: 'center',
                                            bottom: '-1.5rem',
                                            left: '25%'
                                        }
                                    }}
                                    secondaryAction={
                                        <>
                                            {showDetails === transformer.name() ?
                                                <IconButton onClick={() => {
                                                    setShowDetails('')
                                                }}>
                                                    <CheckOutlined />
                                                </IconButton> :
                                                <IconButton onClick={() => {
                                                    setShowDetails(transformer.name())
                                                }}>
                                                    <EditOutlined />
                                                </IconButton>
                                            }

                                            <IconButton onClick={() => {
                                                pipeline.erase(i)
                                            }}>
                                                <ClearOutlined />
                                            </IconButton>
                                        </>
                                    }>
                                    <ListItemText
                                        primary={transformer.name()}
                                        secondary={
                                            showDetails === transformer.name() && (
                                                {
                                                    'InterpolateArticulation':
                                                        <ArticulationOptions
                                                            options={transformer.options as InterpolateArticulationOptions}
                                                            setOptions={options => transformer.setOptions(options)} />,
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
                    <Button onClick={() => { }}>
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
