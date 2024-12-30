import { Delete } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { AnyEditorialAction } from "linked-rolls";

interface ActionListProps {
    actions: AnyEditorialAction[]
    removeAction: (action: AnyEditorialAction) => void
}

export const ActionList = ({ actions, removeAction }: ActionListProps) => {
    return (
        <List>
            {actions.map(action => {
                return (
                    <ListItem key={`actionList_${action.id}`}>
                        <ListItemText
                            primary={
                                <div>
                                    <b>{action.type}</b>{' '}
                                    {action.certainty && (
                                        <span style={{ color: 'gray' }}>(certainty: {action.certainty})</span>
                                    )}
                                </div>
                            }
                            secondary={
                                <p>{action.note}</p>
                            } />
                        <ListItemSecondaryAction>
                            <IconButton onClick={() => removeAction(action)}>
                                <Delete />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                )
            })}
        </List>
    )
}