import { Button, Dialog, FormControl, FormLabel, MenuItem, Select, Stack } from "@mui/material"
import { AnyRollEvent, HandAssignment, RollCopy } from "linked-rolls"
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

    return (
        <Dialog open={open} onClose={() => onDone()}>
            <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                <FormControl>
                    <FormLabel>Responsible Hand</FormLabel>
                    <Select
                        size='small'
                        value={assignedHand}
                        onChange={e => setAssignedHand(e.target.value as string)}
                    >
                        {copy.hands.map((editing) => {
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
                <Button
                    onClick={() => {
                        if (assignedHand === '') onDone()
                        else {
                            onDone({
                                type: 'handAssignment',
                                id: v4(),
                                hand: copy.hands.find(e => e.id === assignedHand)!,
                                target: selection,
                                certainty: 'likely',
                            })
                        }
                        clearSelection()
                    }}
                    variant='contained'>
                    Done
                </Button>
            </Stack>
        </Dialog>
    )
}
