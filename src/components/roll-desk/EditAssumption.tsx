import { Delete } from "@mui/icons-material"
import { Button, Dialog, DialogActions, DialogContent, Divider, FormControl, FormLabel, IconButton, MenuItem, Select, SelectChangeEvent, Stack, TextField } from "@mui/material"
import { AnyEditorialAssumption, Certainty, EditMotivation, editMotivations } from "linked-rolls"
import { useEffect, useState } from "react"
import { titleFor } from "./AssumptionList"

interface StringListProps {
    title: string
    strings: string[]
    onChange: (strings: string[]) => void
}

const StringList = ({ title, strings, onChange }: StringListProps) => {
    return (
        <FormControl>
            <FormLabel>{title}</FormLabel>
            <Stack direction='column' spacing={1}>
                {strings.map((string, index) => {
                    return (
                        <Stack direction='row' spacing={1} key={index}>
                            <TextField
                                key={index}
                                value={string}
                                onChange={e => {
                                    const newStrings = [...strings]
                                    newStrings[index] = e.target.value
                                    onChange(newStrings)
                                }}
                            />
                            <IconButton onClick={() => {
                                const newStrings = [...strings]
                                newStrings.splice(index, 1)
                                onChange(newStrings)
                            }
                            }>
                                <Delete />
                            </IconButton>
                        </Stack>
                    )
                })}
                <Button
                    variant='contained'
                    onClick={() => onChange([...strings, ''])}
                >
                    Add
                </Button>
            </Stack>
        </FormControl>
    )
}

interface PremiseSelectProps {
    existingPremises: AnyEditorialAssumption[]
    premises: AnyEditorialAssumption[]
    onChange: (premises: AnyEditorialAssumption[]) => void
}

const PremiseSelect = ({ existingPremises, premises, onChange }: PremiseSelectProps) => {
    return (
        <FormControl>
            <FormLabel>Premises</FormLabel>
            <Select
                multiple
                label='Witnesses'
                value={premises.map(p => p.id)}
                onChange={(event: SelectChangeEvent<string[]>) => {
                    const value = event.target.value
                    const newPremiseIds = typeof value === 'string'
                        ? value.split(',')
                        : value
                    onChange(newPremiseIds.map(id => existingPremises.find(p => p.id === id)!))
                }}
            >
                {existingPremises.map(premise => {
                    return (
                        <MenuItem key={premise.id} value={premise.id}>
                            [{premise.certainty}] {titleFor(premise)}
                        </MenuItem>
                    )
                })}
            </Select>
        </FormControl>
    )
}

interface AddArgumentationProps {
    existingPremises: AnyEditorialAssumption[]
    open: boolean
    selection: AnyEditorialAssumption[]
    onClose: () => void
}

export const EditAssumption = ({ existingPremises, selection, onClose, open }: AddArgumentationProps) => {
    const [actor, setActor] = useState<string | null | undefined>()
    const [premises, setPremises] = useState<AnyEditorialAssumption[]>([])
    const [observations, setObservations] = useState<string[]>([])
    const [beliefAdoptions, setBeliefAdoptions] = useState<string[]>([])
    const [questions, setQuestions] = useState<string[]>([])
    const [note, setNote] = useState<string | null | undefined>()
    const [cert, setCert] = useState<Certainty | null | undefined>()
    const [editMotivation, setEditMotivation] = useState<EditMotivation | null | undefined>()

    useEffect(() => {
        function unify<T>(arr: Array<T | undefined>): T | null | undefined {
            if (arr.every(v => v === undefined)) return undefined
            const [first, ...rest] = arr
            return rest.every(v => v === first) ? first : null
        }

        setActor(unify(selection.map(item => item.argumentation.actor)))
        setNote(unify(selection.map(item => item.argumentation.note)))
        if (selection.length > 0) {
            setPremises(selection[0].argumentation.premises || [])
            setObservations(selection[0].argumentation.observations || [])
            setBeliefAdoptions(selection[0].argumentation.adoptedBeliefs || [])
        }
        setCert(unify(selection.map(item => item.certainty)))

        if (selection.every(assumption => assumption.type === 'edit')) {
            setEditMotivation(unify(selection.map(edit => edit.motivation)))
        }
    }, [selection])

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogContent>
                <Stack direction='column' spacing={2}>
                    {selection.every(assumption => assumption.type === 'edit') && (
                        <FormControl>
                            <FormLabel>Edit Motivation</FormLabel>
                            <Select
                                size='small'
                                value={editMotivation === null ? 'multiple' : editMotivation || 'unset'}
                                onChange={e => setEditMotivation(e.target.value as EditMotivation)}
                            >
                                {editMotivations.map((motivationItem) => {
                                    return (
                                        <MenuItem value={motivationItem} key={motivationItem}>
                                            {motivationItem}
                                        </MenuItem>
                                    )
                                })}
                                {editMotivation === null && (
                                    <MenuItem disabled value='multiple'>
                                        <i>Multiple</i>
                                    </MenuItem>
                                )}
                                {editMotivation === undefined && (
                                    <MenuItem disabled value='unset'>
                                        <i>Not defined</i>
                                    </MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    )}
                    <FormControl>
                        <FormLabel>Actor</FormLabel>
                        <TextField
                            label='Actor'
                            variant='filled'
                            size='small'
                            value={actor === null ? 'multiple' : actor || ''}
                            onChange={e => setActor(e.target.value)}
                        />
                    </FormControl>
                    <Divider />
                    <PremiseSelect
                        premises={premises}
                        onChange={(premises) => setPremises(premises)}
                        existingPremises={existingPremises}
                    />
                    <Stack direction='row' spacing={1}>
                        <StringList title='Observations' strings={observations} onChange={setObservations} />
                        <StringList title='References' strings={beliefAdoptions} onChange={setBeliefAdoptions} />
                    </Stack>
                    <FormControl>
                        <FormLabel>Note</FormLabel>
                        <TextField
                            label='Note'
                            variant='filled'
                            size='small'
                            value={note === null ? 'multiple' : note || ''}
                            onChange={e => setNote(e.target.value)}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Certainty</FormLabel>
                        <Select
                            label='Certainty'
                            value={cert === null ? 'multiple' : cert || 'unset'}
                            onChange={e => {
                                setCert(e.target.value as Certainty)
                            }}
                        >
                            <MenuItem value='true'>True</MenuItem>
                            <MenuItem value='probable'>Probable</MenuItem>
                            <MenuItem value='likely'>Likely</MenuItem>
                            <MenuItem value='unlikely'>Unlikely</MenuItem>
                            <MenuItem value='false'>False</MenuItem>
                            {cert === null && <MenuItem disabled value='multiple'><i>Multiple</i></MenuItem>}
                            {cert === undefined && <MenuItem disabled value='unset'><i>not set</i></MenuItem>}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <StringList
                            title='Open questions'
                            strings={questions}
                            onChange={setQuestions}
                        />
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        selection.forEach(selection => {
                            if (cert) selection.certainty = cert
                            if (actor) selection.argumentation.actor = actor
                            if (premises.length) selection.argumentation.premises = premises
                            if (observations.length) selection.argumentation.observations = observations
                            if (beliefAdoptions.length) selection.argumentation.adoptedBeliefs = beliefAdoptions
                            if (questions.length) selection.questions = questions
                            if (note) selection.argumentation.note = note
                            if (editMotivation && selection.type === 'edit') {
                                selection.motivation = editMotivation
                            }
                        })
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog >
    )
}
