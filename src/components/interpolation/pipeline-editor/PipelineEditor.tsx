import { AddOutlined, CheckOutlined, ClearOutlined, EditOutlined } from "@mui/icons-material"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, List, ListItem, ListItemText, Stack } from "@mui/material"
import { FC, useState } from "react"
import { InterpolatePhysicalOrnamentationOptions, InterpolateTempoMapOptions, Pipeline } from "../../../lib/transformers"
import { PhysicalOrnamentationOptions } from "./options/PhysicalOrnamentationOptions"
import { TempoOptions } from "./options/TempoOptions"

interface PipelineEditorProps {
    pipeline: Pipeline
    onReady: () => void,
    dialogOpen: boolean,
}

export const PipelineEditor: FC<PipelineEditorProps> = ({ pipeline, dialogOpen, onReady }): JSX.Element => {
    const [showDetails, setShowDetails] = useState('')

    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Pipeline Editor</DialogTitle>
            <DialogContent>
                <Stack>
                    <List sx={{minWidth: '1000', m: 2}}>
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
                    <Button onClick={() => {}}>
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
