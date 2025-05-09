import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material"
import { AnyRollEvent, Conjecture } from "linked-rolls"
import { v4 } from "uuid"

interface UnifyProps {
    open: boolean
    onClose: () => void
    selection: AnyRollEvent[]
    clearSelection: () => void
    onDone: (conjecture: Conjecture) => void
}

export const UnifyDialog = ({ open, onClose, selection, clearSelection, onDone }: UnifyProps) => {
    if (selection.length === 0) return null

    const froms = selection.map(e => e.horizontal.from)
    const tos = selection.map(e => e.horizontal.to).filter(to => to !== undefined)

    const minFrom = Math.min(...froms)
    const maxTo = Math.max(...tos)

    const unit = selection[0].horizontal.unit

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Unify</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <div>
                        Unifying <b>{selection.length}</b> events{' '}
                        from {minFrom.toFixed(0)}{unit}{' '}
                        to {maxTo.toFixed(0)}{unit}
                    </div>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    variant='outlined'
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => {
                        const copy = structuredClone(selection[0])
                        copy.id = v4()
                        copy.horizontal.from = minFrom
                        copy.horizontal.to = maxTo
                        copy.annotates = undefined

                        onDone({
                            type: 'conjecture',
                            id: v4(),
                            replaced: selection,
                            with: [copy],
                            certainty: 'likely',
                        })
                        clearSelection()
                        onClose()
                    }}
                    variant='contained'
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}