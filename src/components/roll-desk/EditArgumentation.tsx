import { Delete } from "@mui/icons-material"
import { Box, Button, Dialog, DialogActions, DialogContent, FormControl, FormLabel, IconButton, MenuItem, Select, Stack, TextField } from "@mui/material"
import { AnyEditorialAssumption, Certainty } from "linked-rolls"
import { useEffect, useState } from "react"

interface PremiseListProps {
    existingPremises: AnyEditorialAssumption[]
    premises: (AnyEditorialAssumption | string)[]
    onChange: (premises: (AnyEditorialAssumption | string)[]) => void
}

const PremiseList = ({ existingPremises, premises, onChange }: PremiseListProps) => {
    return (
        <>
            {premises.map((premise, index) => {
                return (
                    <Stack direction='row' spacing={2} key={index}>
                        <FormControl>
                            <FormLabel>Premise {index + 1}</FormLabel>
                            <Select
                                size='small'
                                value={typeof premise === 'string' ? premise : premise.id}
                                onChange={e => {
                                    premises[index] = existingPremises.find(p => p.id === e.target.value) || ''
                                    onChange([...premises])
                                }}
                            >
                                {existingPremises.map(premise => {
                                    return (
                                        <MenuItem key={premise.id} value={premise.id}>
                                            {premise.type} | {premise.argumentation.note || '[no note]'}
                                        </MenuItem>
                                    )
                                })}
                            </Select>
                        </FormControl>
                        <Box>
                            <IconButton
                                onClick={() => {
                                    premises.splice(index, 1)
                                    onChange([...premises])
                                }}
                            >
                                <Delete />
                            </IconButton>
                        </Box>
                    </Stack>
                )
            })}

            <Button
                onClick={() => {
                    premises.push('')
                    onChange([...premises])
                }}
            >
                Add Premise
            </Button>
        </>
    )
}

interface AddArgumentationProps {
    existingPremises: AnyEditorialAssumption[]
    open: boolean
    selection: AnyEditorialAssumption[]
    onClose: () => void
}

export const EditArgumentation = ({ existingPremises, selection, onClose, open }: AddArgumentationProps) => {
    const [actor, setActor] = useState<string | null | undefined>()
    const [premises, setPremises] = useState<(string | AnyEditorialAssumption)[]>([])
    const [note, setNote] = useState<string | null | undefined>()
    const [cert, setCert] = useState<Certainty | null | undefined>()

    useEffect(() => {
        function unify<T>(arr: Array<T | undefined>): T | null | undefined {
            if (arr.every(v => v === undefined)) return undefined
            const [first, ...rest] = arr
            return rest.every(v => v === first) ? first : null
        }

        setActor(unify(selection.map(item => item.argumentation.actor)))
        setNote(unify(selection.map(item => item.argumentation.note)))
        if (selection.length > 0) {
            setPremises(selection[0].argumentation.premises)
        }
        setCert(unify(selection.map(item => item.certainty)))
    }, [selection])

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <Stack direction='column' spacing={2}>
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
                    <PremiseList
                        premises={premises}
                        onChange={(premises) => setPremises(premises)}
                        existingPremises={existingPremises}
                    />
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
                            <MenuItem value='likely'>Likely</MenuItem>
                            <MenuItem value='unlikely'>Unlikely</MenuItem>
                            <MenuItem value='false'>False</MenuItem>
                            {cert === null && <MenuItem disabled value='multiple'><i>Multiple</i></MenuItem>}
                            {cert === undefined && <MenuItem disabled value='unset'><i>not set</i></MenuItem>}
                        </Select>
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
                            if (premises) selection.argumentation.premises = premises
                            if (note) selection.argumentation.note = note
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
