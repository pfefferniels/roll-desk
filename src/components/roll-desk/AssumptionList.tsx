import { Delete, Edit } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemButton, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { AnyEditorialAssumption } from "linked-rolls";
import { EditAssumption } from "./EditAssumption";
import { useEffect, useRef, useState } from "react";

const titleFor = (assumption: AnyEditorialAssumption) => {
    let title: string = assumption.type 
    if (assumption.type === 'handAssignment') {
        title = `Hand Assignment → ${assumption.hand.carriedOutBy}`
    }
    else if (assumption.type === 'objectUsage') {
        title = `Using → ${('siglum' in assumption.original) && assumption.original.siglum}`
    }
    return title
}

interface AssumptionListProps {
    assumptions: AnyEditorialAssumption[]
    selection: AnyEditorialAssumption[]
    onUpdate: () => void
    removeAction: (action: AnyEditorialAssumption) => void
}

export const AssumptionList = ({ assumptions, selection, removeAction, onUpdate }: AssumptionListProps) => {
    const [assumptionToEdit, setAssumptionToEdit] = useState<AnyEditorialAssumption>()
    const listRef = useRef<HTMLUListElement>(null)

    useEffect(() => {
        if (selection.length > 0 && listRef.current) {
            const firstSelectedItem = document.getElementById(`assumptionItem_${selection[0].id}`)
            if (firstSelectedItem) {
                firstSelectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
        }
    }, [selection])

    return (
        <List ref={listRef}>
            {assumptions.map(assumption => {
                return (
                    <ListItem key={`assumptionItem_${assumption.id}`} id={`assumptionItem_${assumption.id}`}>
                        <ListItemButton selected={selection.includes(assumption)}>
                            <ListItemText
                                primary={
                                    <div>
                                        <b>{titleFor(assumption)}</b>{' '}<br/>
                                        {assumption.certainty && (
                                            <span style={{ color: 'gray' }}>certainty: {assumption.certainty}</span>
                                        )}
                                    </div>
                                }
                                secondary={
                                    <p style={{
                                        maxWidth: '70%'
                                    }}
                                    >
                                        <b>{assumption.argumentation.premises.length === 0 ? 'No premises' : 'Premises'}</b>
                                        <ul>
                                            {assumption.argumentation.premises.map((premise, i) => {
                                                return (
                                                    <li key={`premise${i}`}>
                                                        {typeof premise === 'string' ? premise : `${premise.type}: ${premise.argumentation.note}`}<sup>{assumption.argumentation.actor}</sup>

                                                    </li>
                                                )
                                            })}
                                        </ul>
                                        <b>Note: </b>
                                        {assumption.argumentation.note}
                                    </p>
                                } />
                            <ListItemSecondaryAction>
                                <>
                                    <IconButton onClick={() => setAssumptionToEdit(assumption)}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton onClick={() => removeAction(assumption)}>
                                        <Delete />
                                    </IconButton>
                                </>
                            </ListItemSecondaryAction>
                        </ListItemButton>
                    </ListItem>
                )
            })}

            {assumptionToEdit && (
                <EditArgumentation
                    existingPremises={assumptions}
                    open={assumptionToEdit !== undefined}
                    onClose={() => {
                        setAssumptionToEdit(undefined)
                        onUpdate()
                    }}
                    selection={[assumptionToEdit]}
                />
            )}
        </List>
    )
}