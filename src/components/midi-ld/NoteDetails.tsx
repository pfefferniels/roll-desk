import { Thing, getInteger } from "@inrupt/solid-client"
import { Box, Stack, TextField } from "@mui/material"
import { midi } from "../../helpers/namespaces"
import { useEffect, useState } from "react"

interface NoteDetailsProps {
    thing: Thing
}

export const NoteDetails = ({ thing }: NoteDetailsProps) => {
    const [velocity, setVelocity] = useState(getInteger(thing, midi('velocity')))
    const [pitch, setPitch] = useState(getInteger(thing, midi('pitch')))

    useEffect(() => {
        setVelocity(getInteger(thing, midi('velocity')))
        setPitch(getInteger(thing, midi('pitch')))
    }, [thing])

    return (
        <Box m={1}>
            <h4>Note {getInteger(thing, midi('pitch'))}</h4>
            <Stack spacing={2}>
                <TextField
                    label='Pitch'
                    type='number'
                    value={pitch}
                    onChange={e => setPitch(+e.target.value)} />
                <TextField
                    label='velocity'
                    type='number'
                    value={velocity}
                    onChange={e => setVelocity(+e.target.value)} />
            </Stack>
        </Box>
    )
}
