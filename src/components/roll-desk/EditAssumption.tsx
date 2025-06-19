import { Accordion, AccordionDetails, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { Belief, certainties, Certainty, EditorialAssumption, flat, Person } from "linked-rolls";
import { useEffect, useState } from "react";
import { v4 } from "uuid";

export interface EditBeliefProps {
    belief: Belief
    onChange: (belief: Belief) => void;
}

export const EditBelief = ({ belief, onChange }: EditBeliefProps) => {
    return (
        <Accordion expanded={false}>
            <AccordionDetails>
                <FormControl fullWidth>
                    <FormLabel>Certainty</FormLabel>
                    <Select
                        value={belief.certainty}
                        onChange={(e) => {
                            belief.certainty = e.target.value as Certainty;
                            onChange({ ...belief });
                        }}>
                        {certainties.map((certainty) => (
                            <MenuItem key={certainty} value={certainty}>
                                {certainty.charAt(0).toUpperCase() + certainty.slice(1)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </AccordionDetails>
        </Accordion>
    )
}

interface PersonEditProps {
    person: Person;
    onChange: (person: Person) => void;
}

export const PersonEdit = ({ person, onChange }: PersonEditProps) => {
    return (
        <FormControl fullWidth>
            <FormLabel>Person</FormLabel>
            <TextField
                value={person.name}
                onChange={(e) => {
                    person.name = e.target.value;
                    onChange({ ...person });
                }}
            />
        </FormControl>
    );
}

interface EditAssumptionProps<Name, Type> {
    open: boolean;
    onClose: () => void;
    assumption: EditorialAssumption<Name, Type>
    onChange: (assumption: EditorialAssumption<Name, Type>) => void;
}

export function EditAssumption<Name, Type>({ assumption, onChange, open, onClose }: EditAssumptionProps<Name, Type>) {
    const [assigned, setAssigned] = useState<typeof assumption['assigned']>(assumption.assigned)
    const [belief, setBelief] = useState<Belief | undefined>(assumption.belief);

    const addBelief = () => {
        setBelief({
            type: 'belief',
            certainty: 'true',
            id: v4(),
            reasons: [],
        })
    }

    useEffect(() => {
        setAssigned(assumption.assigned);
        setBelief(assumption.belief);
    }, [assumption])

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>
                Edit
                <span> </span>
                {(assumption.type as string)
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/^./, str => str.toUpperCase())
                }
            </DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    {assumption.type === 'actorAssignment' && (
                        <PersonEdit
                            person={assigned as Person}
                            onChange={(actor) => {
                                setAssigned(actor as Type);
                            }}
                        />
                    )}

                    {!belief && (
                        <Button onClick={addBelief}>
                            Add Belief
                        </Button>
                    )}

                    {belief && (
                        <>
                            <EditBelief
                                belief={belief}
                                onChange={(belief) => {
                                    setBelief(belief);
                                }}
                            />
                            <Button onClick={() => {
                                setBelief(undefined)
                            }}>
                                Remove Belief
                            </Button>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={() => {
                    onChange({ ...assumption, belief, assigned: assigned || assumption.assigned })
                }}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}