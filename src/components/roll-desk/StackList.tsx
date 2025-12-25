import { Visibility, VisibilityOff, ColorLens, ChangeHistory, Commit, ExpandLess, ExpandMore } from "@mui/icons-material"
import { List, ListItem, ListItemIcon, IconButton, ListItemButton, ListItemText, Tooltip, Collapse } from "@mui/material"
import { PaperStretch } from "linked-rolls"
import { useContext, useState } from "react"
import { ColorDialog } from "./ColorDialog"
import { Arguable } from "./Arguable"
import { EditionContext } from "../../providers/EditionContext"
import { valueOf } from "linked-rolls/lib/Assumption"

export interface LayerInfo {
    color: string
    symbolOpacity: number
    facsimileOpacity: number
    copyId: string
    visible: boolean
}

interface LayerStackProps {
    activeId?: string
    layerInfos: LayerInfo[]

    onChange: (stack: LayerInfo[]) => void
    onClick: (copyId: string) => void
}

export const LayerStack = ({ layerInfos, activeId, onChange, onClick }: LayerStackProps) => {
    const { edition } = useContext(EditionContext)

    const [clickedLayer, setClickedLayer] = useState<LayerInfo>();

    if (!edition) return null

    return (
        <>
            <List dense>
                {layerInfos.map((layer, i) => {
                    const copy = edition.copies.find(c => c.id === layer.copyId)
                    if (!copy) return null

                    const date = copy.production?.date
                        ? (
                            <Arguable
                                path={['copies', edition.copies.indexOf(copy) || 0, 'production', 'date']}
                            >
                                {new Intl.DateTimeFormat().format(
                                    valueOf(copy.production.date)
                                )}
                            </Arguable>
                        )
                        : 'unknown date'



                    return (
                        <>
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
                                            layer.visible = !layer.visible
                                            onChange([...layerInfos])
                                        }}
                                    >
                                        {layer.visible ? <Visibility /> : <VisibilityOff />}
                                    </IconButton>
                                </ListItemIcon>
                                <ListItemButton onClick={() => onClick(layer.copyId)}>
                                    <ListItemText
                                        style={{ border: layer.copyId === activeId ? '3px' : '1px' }}
                                        primary={
                                            <span style={{ fontWeight: layer.copyId === activeId ? 'bold' : 'normal' }}>
                                                {date}
                                            </span>
                                        }
                                        secondary={
                                            <>
                                                {copy.location}
                                                <br />
                                                {copy.conditions.map((c, idx) => {
                                                    return (
                                                        <Arguable
                                                            key={`condition_${idx}`}
                                                            path={['copies', edition?.copies.indexOf(copy) || 0, 'conditions', idx]}
                                                        >
                                                            <span>
                                                                {c.type === 'general'
                                                                    ? c.description
                                                                    : `Paper Stretch: ${(c as PaperStretch).factor.toFixed(3)}`}
                                                            </span>
                                                        </Arguable>
                                                    )
                                                })}
                                            </>
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        </>
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
                        onChange([...layerInfos])
                    }}
                />
            )
            }
        </>
    )
}
