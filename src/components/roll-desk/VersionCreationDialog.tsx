import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material"
import { assignObject, assignValue, Concept, valueOf, VersionCreation } from "linked-rolls"
import { DateField } from "./DateField"
import { useDraft } from "../../hooks/useDraft"

/**
 * The rules a version may have been made by. A roll issued for another
 * system was re-punched by an editor of the publisher's, who carried
 * the notes over at their pitch and re-spelled the expression in the
 * other system's words. That rule is what the version's edits carry
 * out, so it is named once here instead of per symbol.
 */
const procedures: Concept[] = [
    {
        id: 'https://w3id.org/reo/type/procedure/system-transfer',
        name: 'transferred to another reproducing system',
        sameAs: []
    },
    {
        id: 'https://w3id.org/reo/type/procedure/revision',
        name: 'revised on the same system',
        sameAs: []
    }
]

interface VersionCreationDialogProps {
    open: boolean
    value?: VersionCreation
    onClose: () => void
    onDone: (creation: VersionCreation | undefined) => void
}

export const VersionCreationDialog = ({ open, value, onClose, onDone }: VersionCreationDialogProps) => {
    const [actor, setActor] = useDraft(value?.actor?.name ?? '')
    const [authority, setAuthority] = useDraft(value?.actor?.sameAs[0] ?? '')
    const [date, setDate] = useDraft(value?.date ? valueOf(value.date) : undefined)
    const [procedure, setProcedure] = useDraft(value?.procedure?.id ?? '')

    const stated = (): VersionCreation | undefined => {
        const named = actor.trim()
        const chosen = procedures.find(candidate => candidate.id === procedure)
        const creation: VersionCreation = {
            ...(named && {
                actor: assignObject({
                    name: named,
                    sameAs: authority.trim() ? [authority.trim()] : []
                })
            }),
            ...(date && { date: assignValue(date) }),
            ...(chosen && { procedure: chosen })
        }

        return Object.keys(creation).length > 0 ? creation : undefined
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
            <DialogTitle>How this version was made</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant='body2' color='text.secondary'>
                        The edits say what changed. This says who changed it and by what rule,
                        so that the mechanical part of a transfer is stated once rather than
                        spelled out for every note.
                    </Typography>
                    <TextField
                        label='Carried out by'
                        value={actor}
                        onChange={event => setActor(event.target.value)}
                    />
                    <TextField
                        label='Authority record'
                        value={authority}
                        onChange={event => setAuthority(event.target.value)}
                    />
                    <DateField label='Date' value={date} onChange={setDate} mayBeEmpty />
                    <TextField
                        label='Rule followed'
                        select
                        value={procedure}
                        onChange={event => setProcedure(event.target.value)}
                    >
                        <MenuItem value=''>Not stated</MenuItem>
                        {procedures.map(candidate => (
                            <MenuItem key={candidate.id} value={candidate.id}>
                                {candidate.name}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={() => {
                        onDone(stated())
                        onClose()
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
