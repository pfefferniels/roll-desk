import { Visibility, VisibilityOff, ColorLens } from "@mui/icons-material"
import { List, ListItem, ListItemIcon, IconButton, ListItemButton, ListItemText, ListItemSecondaryAction, Divider } from "@mui/material"
import { Fragment } from "react"
import { OperationsAsText } from "./OperationAsText"
import { LayerInfo, stringToColour } from "./RollDesk"
import { RollCopy } from "linked-rolls"

interface StackListProps {
    stack: LayerInfo[]
    setStack: (newStack: LayerInfo[]) => void
    copies: RollCopy[]
    activeLayerId: string
    setActiveLayerId: (newActiveLayerId: string) => void
    onChangeColor: (item: LayerInfo) => void
}

export const StackList = ({ stack, setStack, copies, activeLayerId, setActiveLayerId, onChangeColor }: StackListProps) => {
    return (
        <List dense>
            {stack.map((stackItem, i) => {
                const copy = copies.find(copy => copy.physicalItem.id === stackItem.id)

                return (
                    <Fragment key={`listItem_${i}`}>
                        <ListItem>
                            <ListItemIcon>
                                <IconButton
                                    size='small'
                                    edge="start"
                                    tabIndex={-1}
                                    onClick={() => {
                                        stackItem.visible = !stackItem.visible
                                        setStack([...stack])
                                    }}
                                >
                                    {stackItem.visible ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                            </ListItemIcon>
                            <ListItemButton
                                onClick={() => setActiveLayerId(stackItem.id)}>
                                <ListItemText
                                    style={{ border: activeLayerId === stackItem.id ? '3px' : '1px' }}
                                    secondary={copy ? <OperationsAsText operations={copy.operations} /> : null}
                                    primary={activeLayerId === stackItem.id ? <b>{stackItem.title}</b> : stackItem.title} />
                            </ListItemButton>
                            <ListItemSecondaryAction>
                                <IconButton
                                    edge="end"
                                    sx={{ color: stackItem.id === 'working-paper' ? 'blue' : stringToColour(stackItem.id) }}
                                    onClick={() => onChangeColor(stackItem)}
                                >
                                    <ColorLens />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                        {i === 0 && <Divider flexItem />}
                    </Fragment>
                )
            })}
        </List>
    )
}