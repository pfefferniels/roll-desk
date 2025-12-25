import { Modification } from "linked-rolls"
import { Arguable } from "./Arguable"
import { useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { List, ListItem, ListItemButton, ListItemText } from "@mui/material"

interface ModificationListProps {
    modifications: Modification[]
    onClick: (modification: Modification) => void
}


export const ModificationList = ({ modifications, onClick }: ModificationListProps) => {
    const { edition, view } = useContext(EditionContext)
    if (!edition || !view) return null

    return (
        <List dense disablePadding>
            {modifications.map((m, i) => {
                let actorPath
                if (m.actor?.["@annotation"]) {
                    actorPath = view.getPath(m.actor["@annotation"].id || '')?.slice(0, -1)
                }

                return (
                    <ListItem key={`mod_${i}_desc`} sx={{ pl: 10 }} onClick={() => onClick(m)}>
                        <ListItemButton>
                            <ListItemText
                                primary={m.purpose}
                                secondary={m.actor && (
                                    <Arguable path={actorPath || []}>
                                        actor: {m.actor?.name}
                                    </Arguable>
                                )}
                            />
                        </ListItemButton>
                    </ListItem>
                )
            })
            }
        </List>
    )
}

