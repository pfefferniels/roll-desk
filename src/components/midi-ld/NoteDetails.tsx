import { Thing, asUrl, buildThing, createThing, getInteger } from "@inrupt/solid-client"
import { Box, Stack, TextField } from "@mui/material"
import { crm, midi } from "../../helpers/namespaces"
import { useEffect, useState } from "react"
import { RDF } from "@inrupt/vocab-common-rdf"

interface NoteDetailsProps {
    thing: Thing
    onChange: (e13s: Thing) => void
}

export const NoteDetails = ({ thing, onChange }: NoteDetailsProps) => {
    const [velocity, setVelocity] = useState(getInteger(thing, midi('velocity')))
    const [pitch, setPitch] = useState(getInteger(thing, midi('pitch')))

    useEffect(() => {
        setVelocity(getInteger(thing, midi('velocity')))
        setPitch(getInteger(thing, midi('pitch')))
    }, [thing])

    const handleVelocityChange = (newVelocity: number) => {
        setVelocity(newVelocity)

        if (!onChange) return
        const e13 = buildThing(createThing())
            .addUrl(RDF.type, crm('E13_Attribute_Assignment'))
            .addUrl(crm('P140_assigned_attribute_to'), asUrl(thing))
            .addInteger(crm('P141_assigned'), newVelocity)
            .addUrl(crm('P177_assigned_property_of_type'), midi('velocity'))
            .build()
        onChange(e13)
    }

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
                    onChange={e => handleVelocityChange(+e.target.value)} />
            </Stack>
        </Box>
    )
}
