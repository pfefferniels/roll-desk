import { Thing, getUrl } from "@inrupt/solid-client"
import { Stack, TextField } from "@mui/material"
import { crm } from "../../helpers/namespaces"

interface E13RangeProps {
    e13: Thing
    onChange: (updatedE13: Thing) => void
}

export const E13Range = ({ e13, onChange }: E13RangeProps) => {
    const range = getUrl(e13, crm('P141_assigned'))

    return (
        <Stack direction='row'>
            <TextField
                label='velocity'
                disabled
                value={range} />
        </Stack>
    )

}