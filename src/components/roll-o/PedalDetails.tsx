import { Thing, asUrl, getInteger, getUrl } from "@inrupt/solid-client"
import { Box, Stack, TextField } from "@mui/material"
import { crm, midi } from "../../helpers/namespaces"

interface PedalDetailsProps {
    thing: Thing
    e13s?: Thing[]
    onChange: (e13s: Thing) => void
}

export const PedalDetails = ({ thing, e13s, onChange }: PedalDetailsProps) => {
    let velocity: 'on' | 'off' | 'half' | number = getInteger(thing, midi('value')) || 0
    if (velocity === 0) velocity = 'off'
    else if (velocity === 127) velocity = 'on'
    else if (velocity === 64) velocity = 'half'

    const velocityE13s = e13s?.filter(e13 =>
        getUrl(e13, crm('P177_assigned_property_of_type')) === midi('value'))

    return (
        <Box m={1}>
            <h4>Pedal Event ({velocity})</h4>

            <Stack spacing={2}>
                {velocityE13s?.map((e13 => (
                    <TextField
                        key={`e13_pedal_range_${asUrl(e13)}`}
                        value={getInteger(e13, crm('P141_assigned'))}
                    />
                )))}
            </Stack>
        </Box>
    )
}
