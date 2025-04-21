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
                // const beliefsAndObservations = (assumption.argumentation.adoptedBeliefs || []).concat(assumption.argumentation.observations || [])
                return (
                    <ListItem key={`assumptionItem_${assumption.id}`} id={`assumptionItem_${assumption.id}`}>
                        <ListItemButton selected={selection.includes(assumption)}>
                            <ListItemText
                                primary={
                                    <div>
                                        <b>{titleFor(assumption)}</b>{' '}<br />
                                        {assumption.certainty && (
                                            <span style={{ color: 'gray' }}>certainty: {assumption.certainty}</span>
                                        )}
                                    </div>
                                }
                                secondary={
                                    <div style={{
                                        maxWidth: '70%'
                                    }}
                                    >
                                        <b>{(assumption.argumentation.premises || []).length === 0 ? 'No premises' : 'Premises'}</b>
                                        <ul>
                                            {(assumption.argumentation.premises || []).map((premise, i) => {
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

                                        {assumption.argumentation.observations && (
                                            <>
                                                <b>{assumption.argumentation.observations.length > 0 && 'Observations'}</b>
                                                <ul>
                                                    {assumption.argumentation.observations.map((observation, i) => {
                                                        return (
                                                            <li
                                                                key={`observation${i}`}
                                                            >
                                                                {observation}
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </>
                                        )}

                                        {assumption.argumentation.adoptedBeliefs && (
                                            <>
                                                <b>{assumption.argumentation.adoptedBeliefs.length > 0 && 'Adopted beliefs'}</b>
                                                <ul>
                                                    {assumption.argumentation.adoptedBeliefs.map((belief, i) => {
                                                        return (
                                                            <li
                                                                key={`belief${i}`}
                                                            >
                                                                {belief}
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </>
                                        )}

                                        {assumption.questions && (
                                            <>
                                                <b>{assumption.questions.length > 0 && 'Questions'}</b>
                                                <ul>
                                                    {assumption.questions.map((question, i) => {
                                                        return (
                                                            <li
                                                                key={`question${i}`}
                                                            >
                                                                {question}
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </>
                                        )}
                                        {assumption.argumentation.note}
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