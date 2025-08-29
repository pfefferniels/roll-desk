import { Visibility, VisibilityOff, ColorLens } from "@mui/icons-material"
import { List, ListItem, ListItemIcon, IconButton, ListItemButton, ListItemText } from "@mui/material"
import { flat, PaperStretch, RollCopy } from "linked-rolls"
import { useState } from "react"
import { ColorDialog } from "./ColorDialog"
import { Arguable } from "./Arguable"

export interface Layer {
    copy: RollCopy
    color: string
    symbolOpacity: number
    facsimileOpacity: number
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
            <List dense>
                {stack.map((layer, i) => {
                    const date = layer.copy.productionEvent?.date
                        ? (
                            <Arguable
                                about={layer.copy.productionEvent.date}
                                onChange={() => { }}
                                viewOnly={false}
                            >
                                {new Intl.DateTimeFormat().format(
                                    flat(layer.copy.productionEvent.date)
                                )}
                            </Arguable>
                        )
                        : 'unknown date';

                    return (
                        <ListItem key={`listItem_${i}`}
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    sx={{ color: layer.color }}
                                    onClick={() => setClickedLayer(layer)}
                                    aria-label="change color and facsimile"
                                >
                                    <ColorLens />
                                </IconButton>
                            }>
                            <ListItemIcon>
                                <IconButton
                                    size='small'
                                    edge="start"
                                    tabIndex={-1}
                                    onClick={() => {
                                        layer.symbolOpacity = 1 - layer.symbolOpacity
                                        onChange([...stack])
                                    }}
                                >
                                    {layer.symbolOpacity === 1 ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                            </ListItemIcon>
                            <ListItemButton onClick={() => onClick(layer)}>
                                <ListItemText
                                    style={{ border: layer === active ? '3px' : '1px' }}
                                    primary={
                                        <span style={{ fontWeight: layer === active ? 'bold' : 'normal' }}>
                                            {date}
                                        </span>
                                    }
                                    secondary={
                                        <div>
                                            {layer.copy.location}
                                            <br/>
                                            {layer.copy.conditions.map((c, idx) => {
                                                return (
                                                    <Arguable
                                                        key={`condition_${idx}` }
                                                        about={c}
                                                        onChange={() => {
                                                            onChange([...stack])
                                                        }}
                                                        viewOnly={false}
                                                    >
                                                        <span>
                                                            {flat(c).type === 'general'
                                                                ? flat(c).description
                                                                : `Paper Stretch: ${(flat(c) as PaperStretch).factor.toFixed(3)}`}
                                                        </span>
                                                    </Arguable>
                                                )
                                            })}
                                        </div>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>
            {clickedLayer && (
                <ColorDialog
                    open={clickedLayer !== undefined}
                    onClose={() => setClickedLayer(undefined)}
                    color={clickedLayer.color}
                    symbolOpacity={clickedLayer.symbolOpacity}
                    facsimileOpacity={clickedLayer.facsimileOpacity}
                    onChange={(color, symbolOpacity, facsimileOpacity) => {
                        clickedLayer.color = color
                        clickedLayer.symbolOpacity = symbolOpacity
                        clickedLayer.facsimileOpacity = facsimileOpacity
                        stack = stack.map(l => l === clickedLayer ? clickedLayer : l)
                        onChange([...stack])
                    }}
                />
            )}
        </>
    )
}
