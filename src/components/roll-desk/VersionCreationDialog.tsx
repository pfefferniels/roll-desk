import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material"
import { assignObject, Concept, procedures, VersionCreation } from "linked-rolls"
import { DateStatementField } from "./DateStatementField"
import { useDraft } from "../../hooks/useDraft"

/** Stands for a stored procedure that names no IRI of its own. */
const UNDECLARED = 'undeclared'

/** What the field holds for a procedure. */
export const keyOf = (procedure: Concept) => procedure.id ?? UNDECLARED

/**
 * The procedures to offer. A version may state one the vocabulary does
 * not know, from an older edition or a hand-written one, and one written
 * before the procedures had IRIs states no id at all. Such a procedure is
 * offered beside the declared ones, so that saving cannot drop it.
 */
export const proceduresOffered = (stored: Concept | undefined): readonly Concept[] =>
    stored && !procedures.some(candidate => candidate.id === stored.id)
        ? [...procedures, stored]
        : procedures

/** The procedure the field stands on, none where it stands on nothing. */
export const procedureIn = (offered: readonly Concept[], key: string): Concept | undefined =>
    offered.find(candidate => keyOf(candidate) === key)

interface VersionCreationDialogProps {
    open: boolean
    value?: VersionCreation
    onClose: () => void
    onDone: (creation: VersionCreation | undefined) => void
}

export const VersionCreationDialog = ({ open, value, onClose, onDone }: VersionCreationDialogProps) => {
    const [actor, setActor] = useDraft(value?.actor?.name ?? '')
    const [authority, setAuthority] = useDraft(value?.actor?.sameAs[0] ?? '')
    const [date, setDate] = useDraft(value?.date)
    const offered = proceduresOffered(value?.procedure)
    const [procedure, setProcedure] = useDraft(value?.procedure ? keyOf(value.procedure) : '')

    const stated = (): VersionCreation | undefined => {
        const named = actor.trim()
        const chosen = procedureIn(offered, procedure)
        const creation: VersionCreation = {
            ...(named && {
                actor: assignObject({
                    name: named,
                    sameAs: authority.trim() ? [authority.trim()] : []
                })
            }),
            ...(date && { date }),
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
                    <DateStatementField label='Date' value={date} onChange={setDate} />
                    <TextField
                        label='Rule followed'
                        select
                        value={procedure}
                        onChange={event => setProcedure(event.target.value)}
                    >
                        <MenuItem value=''>Not stated</MenuItem>
                        {offered.map(candidate => (
                            <MenuItem key={keyOf(candidate)} value={keyOf(candidate)}>
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
