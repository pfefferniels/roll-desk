import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, Stack } from "@mui/material"
import { Unstable_NumberInput as NumberInput } from '@mui/base/Unstable_NumberInput';
import { useState } from "react"
import { v4 } from "uuid"
import { AnyRollEvent, Conjecture } from "linked-rolls";

interface SeparateProps {
    open: boolean
    onClose: () => void
    selection: AnyRollEvent
    clearSelection: () => void
    breakPoint: number
    onDone: (separation: Conjecture) => void
}

export const SeparateDialog = ({ open, onClose, selection, clearSelection, onDone, breakPoint }: SeparateProps) => {
    const [gap, setGap] = useState<number>()

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Separate</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <div>
                        Separating {selection.id} at {breakPoint}
                    </div>
                    <FormControl>
                        <FormLabel>
                            Gap (in {selection.horizontal.unit || 'mm'})
                        </FormLabel>
                        <NumberInput
                            min={1}
                            max={10}
                            value={gap}
                            onChange={(_, value) => setGap(value)} />
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => {
                        const originalStart = selection.horizontal.from
                        const originalEnd = selection.horizontal.to

                        const leftEvent = structuredClone(selection)
                        leftEvent.annotates = undefined
                        leftEvent.horizontal.from = originalStart
                        leftEvent.horizontal.to = breakPoint - (gap || 0) / 2
                        leftEvent.id = v4()

                        const rightEvent = structuredClone(selection)
                        rightEvent.annotates = undefined
                        rightEvent.horizontal.from = breakPoint + (gap || 0) / 2
                        rightEvent.horizontal.to = originalEnd
                        rightEvent.id = v4()

                        onDone({
                            type: 'conjecture',
                            id: v4(),
                            replaced: [selection],
                            with: [leftEvent, rightEvent],
                            certainty: 'likely'
                        })
                        clearSelection()
                        onClose()
                    }}
                    variant='contained'
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog >
    )
}
