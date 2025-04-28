import { Button, Divider, Drawer, Stack } from "@mui/material"
import { RollCopy, AnyRollEvent } from "linked-rolls"
import { useState } from "react"
import { v4 } from "uuid"

interface AddConjectureProps {
    selection: AnyRollEvent[]
    copy: RollCopy
    open: boolean
    onClose: () => void
    clearSelection: () => void
}

export const AddConjecture = ({ selection, copy, open, onClose, clearSelection }: AddConjectureProps) => {
    const [original, setOriginal] = useState<AnyRollEvent[]>([])
    const [correction, setCorrection] = useState<AnyRollEvent[]>([])

    const handleInsert = () => {
        // these events will live now inside the conjecture
        for (const event of correction) {
            copy.removeEvent(event.id)
        }

        copy.applyActions([
            {
                type: 'conjecture',
                certainty: 'likely',
                replaced: original,
                with: correction,
                id: v4()
            }
        ])
    }

    const markOriginal = () => {
        setOriginal(selection)
        clearSelection()
    }

    const markCorrection = () => {
        setCorrection(selection)
        clearSelection()
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            variant='persistent'
            anchor='left'
        >
            <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                <div>
                    Original: {original.length}<br />
                    Correction: {correction.length}
                </div>

                <Button variant='contained' onClick={markOriginal}>
                    Mark Original ({selection.length})
                </Button>
                <Button variant='contained' onClick={markCorrection}>
                    Mark Correction ({selection.length})
                </Button>

                <Divider orientation='horizontal' />
                <Stack direction='row' spacing={2}>
                    <Button
                        variant='contained'
                        onClick={() => {
                            handleInsert()
                            onClose()
                        }}
                    >
                        Done
                    </Button>
                    <Button
                    variant="outlined"
                    onClick={onClose}
                    >
                        Cancel
                    </Button>
                </Stack>
            </Stack>
        </Drawer>
    )
}
