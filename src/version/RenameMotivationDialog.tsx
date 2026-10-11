import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material"
import { Motivation, Version } from "linked-rolls"
import { KeyboardEvent, useState } from "react"
import { reasonFor, usesOf } from "./MotivateDialog"
import { editCount } from "../stemma/SlicedBalloon"

interface RenameMotivationDialogProps {
    /** The version the motivation belongs to, whose other motivations it is told apart from. */
    version: Version
    motivation: Motivation
    /** The new words, trimmed. */
    onDone: (note: string) => void
    onClose: () => void
}

/**
 * Puts what a motivation says in other words. Its id stays as it is,
 * although it was made from the old words: it is the motivation's
 * address, and what refers to it would otherwise find nothing.
 */
export const RenameMotivationDialog = ({ version, motivation, onDone, onClose }: RenameMotivationDialogProps) => {
    const [note, setNote] = useState(motivation.note ?? '')
    const words = note.trim()

    // Another motivation of the version in these words would be the same
    // reason given twice, which the editor may rather want to merge.
    const others = version.motivations.filter(other => other.id !== motivation.id)
    const twin = reasonFor(others, words)
    const repeats = !!twin && typeof twin !== 'string'

    const done = () => {
        if (words) onDone(words)
    }

    // Shift+Enter still breaks a line, as in the dialog the motivation was given in.
    const doneOnEnter = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' || event.shiftKey) return
        event.preventDefault()
        done()
    }

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
            <DialogTitle>Rename Motivation</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Why the {editCount(usesOf(version).get(motivation.id) ?? 0)} it
                    holds were made. Its identifier, <code>{motivation.id}</code>,
                    stays as it is, so that what refers to it still finds it.
                </DialogContentText>
                <TextField
                    fullWidth
                    multiline
                    autoFocus
                    maxRows={6}
                    size='small'
                    label='Reason'
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    onKeyDown={doneOnEnter}
                    error={repeats}
                    helperText={repeats ? 'Another motivation of the version gives this reason already.' : undefined}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' disabled={!words || words === motivation.note} onClick={done}>
                    Rename
                </Button>
            </DialogActions>
        </Dialog>
    )
}
