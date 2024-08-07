import { Button, Drawer, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { RollCopy } from "linked-rolls"
import { AnyRollEvent, Certainty, HandAssignment } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface AssignHandProps {
    open: boolean
    selection: AnyRollEvent[]

    /**
     * The roll copy to which the selection belongs
     */
    copy: RollCopy
    clearSelection: () => void
    onDone: (assignment?: HandAssignment) => void
}

export const AssignHand = ({ copy, selection, clearSelection, onDone, open }: AssignHandProps) => {
    const [assignedHand, setAssignedHand] = useState<string>('')
    const [cert, setCert] = useState<Certainty>('unknown')
    const [note, setNote] = useState('')

    return (
        <Drawer open={open} variant='persistent'>
            <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                <FormControl>
                    <FormLabel>Responsible Hand</FormLabel>
                    <Select
                        size='small'
                        value={assignedHand}
                        onChange={e => setAssignedHand(e.target.value as string)}
                    >
                        {copy.editings.map((editing) => {
                            return (
                                <MenuItem value={editing.id} key={editing.id}>
                                    {editing.carriedOutBy}
                                </MenuItem>
                            )
                        })}
                        <MenuItem value={''}>
                            (unknown)
                        </MenuItem>
                    </Select>
                </FormControl>

                <FormControl>
                    <FormLabel>Certainty</FormLabel>
                    <Select size='small' value={cert} onChange={e => {
                        setCert(e.target.value as Certainty)
                    }}>
                        <MenuItem value='high'>High</MenuItem>
                        <MenuItem value='medium'>Medium</MenuItem>
                        <MenuItem value='low'>Low</MenuItem>
                        <MenuItem value='Unknown'>Unknown</MenuItem>
                    </Select>
                </FormControl>
                <FormControl>
                    <FormLabel>Note</FormLabel>
                    <TextField
                        size='small'
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        minRows={4} />
                </FormControl>

                <Button
                    onClick={() => {
                        if (assignedHand === '') onDone()
                        else {
                            onDone({
                                type: 'handAssignment',
                                carriedOutBy: '#np',
                                id: v4(),
                                hand: copy.editings.find(e => e.id === assignedHand)!,
                                assignedTo: selection,
                                certainty: cert,
                                note
                            })
                        }
                        clearSelection()
                    }}
                    variant='contained'>
                    Done
                </Button>
            </Stack>
        </Drawer>
    )
}
