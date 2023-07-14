import { Thing, asUrl, buildThing, createThing, getInteger, getUrl } from "@inrupt/solid-client"
import { Box, Stack, TextField } from "@mui/material"
import { crm, midi } from "../../helpers/namespaces"
import { useEffect, useState } from "react"
import { RDF } from "@inrupt/vocab-common-rdf"
import { Midi } from "tonal";
import { E13Range } from "./E13Range"

interface NoteDetailsProps {
    thing: Thing
    e13s?: Thing[]
    onChange: (e13s: Thing) => void
}

export const NoteDetails = ({ thing, e13s, onChange }: NoteDetailsProps) => {
    const velocity = getInteger(thing, midi('velocity'))
    const pitch = Midi.midiToNoteName(getInteger(thing, midi('pitch')) || 0)

    const velocityE13s = e13s?.filter(e13 =>
        getUrl(e13, crm('P177_assigned_property_of_type')) === midi('velocity'))

    const pitchE13s = e13s?.filter(e13 =>
        getUrl(e13, crm('P177_assigned_property_of_type')) === midi('pitch'))
    
    return (
        <Box m={1}>
            <h4>Note {pitch}</h4>
            <Stack spacing={2}>
                <TextField
                    label='velocity'
                    type='number'
                    disabled
                    value={velocity} />

                {velocityE13s?.map((e13 => (
                    <E13Range
                        key={`e13_range_${asUrl(e13)}`}
                        e13={e13}
                        onChange={onChange} />
                )))}
            </Stack>
        </Box>
    )
}
