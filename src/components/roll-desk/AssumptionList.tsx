import { Delete, Edit } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemButton, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { AnyEditorialAssumption } from "linked-rolls";
import { EditAssumption } from "./EditAssumption";
import { useEffect, useRef, useState } from "react";

const scrollIntoView = (assumption: AnyEditorialAssumption) => {
    const el = document.getElementById(`assumptionItem_${assumption.id}`)
    el && el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

export const titleFor = (assumption: AnyEditorialAssumption) => {
    let title: string = assumption.type
    if (assumption.type === 'handAssignment') {
        title = `Hand Assignment → ${assumption.hand.carriedOutBy}`
    }
    else if (assumption.type === 'objectUsage') {
        title = `Using → ${('siglum' in assumption.original) && assumption.original.siglum}`
    }
    else if (assumption.type === 'edit') {
        title = `Edit ${assumption.motivation ? `(${assumption.motivation})` : ''}`
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
            scrollIntoView(selection[0])
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
                                        <div><b>{titleFor(assumption)}</b>{' '}</div>
                                        <div style={{ color: 'gray' }}>{assumption.id.slice(0, 8)}</div>
                                        {assumption.type === 'intention' && (
                                            <div>{assumption.description}</div>
                                        )}
                                        {assumption.certainty && (
                                            <div>certainty: {assumption.certainty}</div>
                                        )}
                                    </div>
                                }
                                secondary={
                                    <div style={{
                                        maxWidth: '70%'
                                    }}
                                    >
                                        {(assumption.reasons || []).map(reason => {
                                            return (
                                                <div>
                                                    <b>{reason.type}</b>
                                                    {reason.note && <div>{reason.note}</div>}
                                                    <br />
                                                    {reason.type === 'inference' && (
                                                        <ul>
                                                            {reason.premises.map((premise, i) => {
                                                                return (
                                                                    <li
                                                                        key={`premise${i}`}
                                                                        onClick={() => {
                                                                            scrollIntoView(premise)
                                                                        }}
                                                                    >
                                                                        {typeof premise === 'string' ? premise : titleFor(premise)}
                                                                    </li>
                                                                )
                                                            })}
                                                        </ul>
                                                    )}

                                                    {reason.type === 'observation' && (
                                                        <span>{(reason.observed || []).length}</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
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
                <EditAssumption
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