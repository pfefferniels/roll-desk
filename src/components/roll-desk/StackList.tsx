import { Visibility, VisibilityOff, ColorLens } from "@mui/icons-material"
import { List, ListItem, ListItemIcon, IconButton, ListItemButton, ListItemText, ListItemSecondaryAction, Divider, Paper } from "@mui/material"
import { RollCopy } from "linked-rolls"
import { useState } from "react"
import { ColorDialog } from "./ColorDialog"

export interface Layer {
    copy: RollCopy
    color: string
    opacity: number
    facsimile: boolean
}

interface LayerStackProps {
    active?: Layer
    stack: Layer[]

    onChange: (stack: Layer[]) => void
    onClick: (layer: Layer) => void
}

export const LayerStack = ({ stack, active, onChange, onClick }: LayerStackProps) => {
    const [clickedLayer, setClickedLayer] = useState<Layer>();

    return (
        <>
            <Paper sx={{ maxWidth: 360 }} elevation={2}>
                <List dense>
                    {stack.map((layer, i) => {
                        return (
                            <div key={`listItem_${i}`}>
                                <ListItem>
                                    <ListItemIcon>
                                        <IconButton
                                            size='small'
                                            edge="start"
                                            tabIndex={-1}
                                            onClick={() => {
                                                layer.opacity = 1 - layer.opacity
                                                onChange([...stack])
                                            }}
                                        >
                                            {layer.opacity === 1 ? <Visibility /> : <VisibilityOff />}
                                        </IconButton>
                                    </ListItemIcon>
                                    <ListItemButton onClick={() => onClick(layer)}>
                                        <ListItemText
                                            style={{ border: layer === active ? '3px' : '1px' }}
                                            primary={
                                                <span style={{ fontWeight: layer === active ? 'bold' : 'normal' }}>
                                                    {layer.copy.location}
                                                    <span>{' '}</span>
                                                    ({layer.copy.productionEvent?.date.assigned || 'unknown date'})
                                                </span>
                                            }
                                            secondary={layer.copy.location}
                                        />
                                    </ListItemButton>
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            sx={{ color: layer.color }}
                                            onClick={() => setClickedLayer(layer)}
                                        >
                                            <ColorLens />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {i === 0 && <Divider flexItem />}
                            </div>
                        )
                    })}
                </List>
            </Paper>
            {clickedLayer && (
                <ColorDialog
                    open={clickedLayer !== undefined}
                    onClose={() => setClickedLayer(undefined)}
                    color={clickedLayer.color}
                    opacity={clickedLayer.opacity}
                    onChange={(color, opacity) => {
                        clickedLayer.color = color
                        clickedLayer.opacity = opacity
                        stack = stack.map(l => l === clickedLayer ? clickedLayer : l)
                        onChange([...stack])
                    }}
                />
            )}
        </>
    )
}
