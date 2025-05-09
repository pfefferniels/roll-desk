import { Add, Delete } from "@mui/icons-material"
import { Button, Dialog, DialogActions, DialogContent, FormControl, FormLabel, IconButton, MenuItem, Paper, Select, Stack, TextField } from "@mui/material"
import { AnyArgumentation, AnyEditorialAssumption, Certainty, EditMotivation, editMotivations, Inference, Observation, Reference } from "linked-rolls"
import { useEffect, useState } from "react"
import { PremiseSelect } from "./PremiseSelect"

interface EditInferenceProps {
    existingPremises: AnyEditorialAssumption[]
    inference: Inference
    onChange: (inference: Inference) => void
    onRemove: () => void
}

const EditInference = ({ inference, onChange, existingPremises, onRemove }: EditInferenceProps) => {
    const setField = <K extends keyof Inference>(key: K) => (value: Inference[K]) => {
        onChange({ ...inference, [key]: value })
    }

    return (
        <Paper sx={{ p: 1 }}>
            <IconButton onClick={onRemove}>
                <Delete />
            </IconButton>
            <Stack direction='column' spacing={1}>
                <PremiseSelect
                    existingPremises={existingPremises}
                    premises={inference.premises}
                    onChange={setField('premises')}
                />
                <Stack direction='row' spacing={1}>
                    <TextField
                        label="Logic"
                        variant="filled"
                        size="small"
                        value={inference.logic ?? ''}
                        onChange={e => setField('logic')(e.target.value)}
                    />
                    <TextField
                        label="Note"
                        variant="filled"
                        size="small"
                        value={inference.note ?? ''}
                        onChange={e => setField('note')(e.target.value)}
                    />
                </Stack>
            </Stack>
        </Paper>

    )
}

interface EditReferenceProps {
    reference: Reference
    onChange: (reference: Reference) => void
}

const EditReference = ({ reference, onChange }: EditReferenceProps) => {
    const setField = <K extends keyof Reference>(key: K) => (value: Reference[K]) => {
        onChange({ ...reference, [key]: value })
    }

    return (
        <div>
            <TextField
                label='Note'
                variant='filled'
                size='small'
                value={reference.note || ''}
                onChange={e => setField('note')(e.target.value)}
            />
        </div>
    )
}

interface EditObservationProps {
    observation: Observation
    onChange: (observation: Observation) => void
}

const EditObservation = ({ observation, onChange }: EditObservationProps) => {
    const setField = <K extends keyof Observation>(key: K) => (value: Observation[K]) => {
        onChange({ ...observation, [key]: value })
    }

    return (
        <div>
            <TextField
                label='Note'
                variant='filled'
                size='small'
                value={observation.note || ''}
                onChange={e => setField('note')(e.target.value)}
            />
        </div>
    )
}

interface AddArgumentationProps {
    existingPremises: AnyEditorialAssumption[]
    open: boolean
    selection: AnyEditorialAssumption[]
    onClose: () => void
}

export const EditAssumption = ({ existingPremises, selection, onClose, open }: AddArgumentationProps) => {
    const [reasons, setReasons] = useState<AnyArgumentation[]>([])
    const [cert, setCert] = useState<Certainty | null | undefined>()

    // TODO: these states are type-specific. Move them to separate components
    const [editMotivation, setEditMotivation] = useState<EditMotivation | null | undefined>()
    const [description, setDescription] = useState<string | null | undefined>()
    const [question, setQuestion] = useState<string | null | undefined>()

    useEffect(() => {
        function unify<T>(arr: Array<T | undefined>): T | null | undefined {
            if (arr.every(v => v === undefined)) return undefined
            const [first, ...rest] = arr
            return rest.every(v => v === first) ? first : null
        }

        setCert(unify(selection.map(item => item.certainty)))

        if (selection.every(assumption => assumption.type === 'edit')) {
            setEditMotivation(unify(selection.map(edit => edit.motivation)))
        }

        if (selection.every(assumption => assumption.type === 'intention')) {
            setDescription(unify(selection.map(intention => intention.description)))
        }

        if (selection.every(assumption => assumption.type === 'question')) {
            setQuestion(unify(selection.map(question => question.question)))
        }

        if (selection.length === 1) {
            setReasons(selection[0].reasons || [])
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
                        <FormLabel>Reasons</FormLabel>
                        <Stack direction='column' spacing={2}>
                            {reasons.map((reason, index) => {
                                if (reason.type === 'inference') {
                                    return (
                                        <EditInference
                                            inference={reason}
                                            onChange={(newReason) => {
                                                const newReasons = [...reasons]
                                                newReasons[index] = newReason
                                                setReasons(newReasons)
                                            }}
                                            existingPremises={existingPremises}
                                            onRemove={() => {
                                                reasons.splice(index, 1)
                                                setReasons([...reasons])
                                            }}
                                        />
                                    )
                                }
                                else if (reason.type === 'reference') {
                                    return (
                                        <EditReference
                                            reference={reason}
                                            onChange={(newReason) => {
                                                const newReasons = [...reasons]
                                                newReasons[index] = newReason
                                                setReasons(newReasons)
                                            }}
                                        />
                                    )
                                }
                                else if (reason.type === 'observation') {
                                    return (
                                        <EditObservation
                                            observation={reason}
                                            onChange={(newReason) => {
                                                const newReasons = [...reasons]
                                                newReasons[index] = newReason
                                                setReasons(newReasons)
                                            }}
                                        />
                                    )
                                }

                                return null
                            })}

                            <Stack direction='row'>
                                <Button
                                    onClick={() => {
                                        setReasons([...reasons, { type: 'inference', premises: [] }])
                                    }}
                                    startIcon={<Add />}
                                >
                                    Inference
                                </Button>
                                <Button
                                    onClick={() => {
                                        setReasons([...reasons, { type: 'reference', note: '' }])
                                    }}
                                    startIcon={<Add />}
                                >
                                    Reference
                                </Button>
                                <Button
                                    onClick={() => {
                                        setReasons([...reasons, { type: 'observation', note: '' }])
                                    }}
                                    startIcon={<Add />}
                                >
                                    Observation
                                </Button>
                            </Stack>
                        </Stack>
                    </FormControl>

                    {selection.every(assumption => assumption.type === 'intention') && (
                        <FormControl>
                            <FormLabel>Intention Description</FormLabel>
                            <TextField
                                value={description || ''}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </FormControl>
                    )}

                    {selection.every(assumption => assumption.type === 'question') && (
                        <FormControl>
                            <FormLabel>Question</FormLabel>
                            <TextField
                                value={question || ''}
                                onChange={e => setQuestion(e.target.value)}
                            />
                        </FormControl>
                    )}

                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        selection.forEach(selection => {
                            if (cert) selection.certainty = cert
                            if (reasons.length) selection.reasons = reasons
                            if (editMotivation && selection.type === 'edit') {
                                selection.motivation = editMotivation
                            }
                            if (description && selection.type === 'intention') {
                                selection.description = description
                            }
                            if (question && selection.type === 'question') {
                                selection.question = question
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
