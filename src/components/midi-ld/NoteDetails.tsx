import { Thing } from "@inrupt/solid-client"
import { Box, Button, Stack } from "@mui/material"

interface NoteDetailsProps {
    thing: Thing
}

export const NoteDetails = ({ thing }: NoteDetailsProps) => {
    return (
        <Stack>
            <h4>Note {thing.url}</h4>
            <Button>Add E13 Attribute Assignment</Button>
        </Stack>
    )
}
