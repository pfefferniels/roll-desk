import { Visibility, VisibilityOff, ColorLens, Edit, Add } from "@mui/icons-material"
import { List, ListItem, ListItemIcon, IconButton, ListItemButton, ListItemText, ListItemSecondaryAction, Divider, Paper, Box } from "@mui/material"
import { Fragment, useState } from "react"
import { OperationsAsText } from "./OperationAsText"
import { LayerInfo } from "./RollDesk"
import { Edition, RollCopy } from "linked-rolls"
import { stringToColor } from "../../helpers/stringToColor"
import { RollCopyDialog } from "./RollCopyDialog"

interface StackListProps {
    stack: LayerInfo[]
    setStack: (newStack: LayerInfo[]) => void
    edition: Edition
    activeLayerId: string
    setActiveLayerId: (newActiveLayerId: string) => void
    onChangeEdition: (newEdition: Edition) => void
    onChangeColor: (item: LayerInfo) => void
}

export const StackList = ({ stack, setStack, edition, activeLayerId, setActiveLayerId, onChangeEdition, onChangeColor }: StackListProps) => {
    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState<RollCopy>()

    console.log('copies=', edition.copies)

    return (
        <>
            <Paper sx={{ maxWidth: 360 }} elevation={2}>
                <List dense>
                    {stack.map((stackItem, i) => {
                        const copy = edition.copies.find(copy => copy.id === stackItem.id)

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
                                            secondary={copy ? <OperationsAsText stretch={copy.stretch} shift={copy.shift} /> : undefined}
                                            primary={activeLayerId === stackItem.id ? <b>{stackItem.title}</b> : stackItem.title} />
                                    </ListItemButton>
                                    <ListItemSecondaryAction>
                                        {stackItem.id !== 'working-paper' && (
                                            <IconButton
                                                edge="end"
                                                onClick={() => setRollCopyDialogOpen(edition.copies.find(copy => copy.id === stackItem.id))}
                                            >
                                                <Edit />
                                            </IconButton>
                                        )}
                                        <IconButton
                                            edge="end"
                                            sx={{ color: stackItem.id === 'working-paper' ? 'blue' : stringToColor(stackItem.id) }}
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
                <Box>
                    <IconButton onClick={() => {
                        const newCopy = new RollCopy()
                        edition.copies.push(newCopy)
                        setRollCopyDialogOpen(newCopy)
                    }}>
                        <Add />
                    </IconButton>
                </Box>
            </Paper>

            <RollCopyDialog
                open={!!rollCopyDialogOpen}
                copy={rollCopyDialogOpen}
                onClose={() => setRollCopyDialogOpen(undefined)}
                onDone={rollCopy => {
                    const index = edition.copies.findIndex(copy => copy.id === rollCopy.id)
                    if (index === -1) {
                        edition.copies.push(rollCopy)
                    }
                    else {
                        edition.copies.splice(index, 1, rollCopy)
                    }
                    console.log(edition.copies)
                    onChangeEdition(edition.shallowClone())
                }}
                onRemove={rollCopy => {
                    const index = edition.copies.findIndex(copy => copy.id === rollCopy.id)
                    if (index !== -1) {
                        edition.copies.splice(index, 1)
                    }
                    onChangeEdition(edition.shallowClone())
                }}
            />
        </>
    )
}
