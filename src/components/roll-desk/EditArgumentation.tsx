import { Button, Dialog, DialogActions, DialogContent, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { AnyEditorialAssumption, Certainty } from "linked-rolls"
import { useEffect, useState } from "react"

interface AddArgumentationProps {
    open: boolean
    selection: AnyEditorialAssumption[]
    onClose: () => void
}

export const EditArgumentation = ({ selection, onClose, open }: AddArgumentationProps) => {
    const [actor, setActor] = useState<string | null | undefined>()
    const [premise, setPremise] = useState<string | null | undefined>()
    const [cert, setCert] = useState<Certainty | null | undefined>()

    useEffect(() => {
        function unify<T>(arr: Array<T | undefined>): T | null | undefined {
            if (arr.every(v => v === undefined)) return undefined
            const [first, ...rest] = arr
            return rest.every(v => v === first) ? first : null
        }

        setActor(unify(selection.map(item => item.argumentation.actor)))
        setPremise(unify(selection.map(item => item.argumentation.premises[0])))
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
                    <FormControl>
                        <FormLabel>Premises</FormLabel>
                        <TextField
                            variant='filled'
                            size='small'
                            value={premise === null ? 'multiple' : premise || ''}
                            onChange={e => setPremise(e.target.value)}
                            minRows={4}
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
                            <MenuItem disabled value='multiple'><i>Multiple</i></MenuItem>
                            <MenuItem disabled value='unset'><i>not set</i></MenuItem>
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
                            if (premise) selection.argumentation.premises = [premise]
                        })
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
