import { List, ListItem, ListItemText } from "@mui/material";
import { Assumption } from "linked-rolls/lib/types";

interface ActionListProps {
    actions: Assumption[]
}

export const ActionList = ({ actions }: ActionListProps) => {
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
                    </ListItem>
                )
            })}
        </List>
    )
}