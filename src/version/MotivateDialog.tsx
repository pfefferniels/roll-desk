import { alpha, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControlLabel, Radio, RadioGroup, TextField } from "@mui/material"
import { Motivation, Version, editsOf } from "linked-rolls"
import { KeyboardEvent, useState } from "react"

/** The motivation all of the given edits already reference, if they agree on one. */
export const sharedMotivation = (version: Version, editIds: readonly string[]) => {
    const referenced = new Set(
        editsOf(version)
            .filter(edit => editIds.includes(edit.id))
            .map(edit => edit.motivation)
    )
    if (referenced.size !== 1) return undefined
    return version.motivations.find(m => m.id === [...referenced][0])
}

/** How many of the version's edits reference each of its motivations, by id. */
export const usesOf = (version: Version) => {
    const uses = new Map<string, number>()
    for (const edit of editsOf(version)) {
        if (!edit.motivation) continue
        uses.set(edit.motivation, (uses.get(edit.motivation) ?? 0) + 1)
    }
    return uses
}

/**
 * What a new reason amounts to: the motivation the version already gives
 * in these words, so that typing a reason out again does not state it a
 * second time, or else the words of a new one. Nothing where none is given.
 */
export const reasonFor = (motivations: readonly Motivation[], note: string): Motivation | string | undefined => {
    const words = note.trim()
    if (!words) return undefined
    return motivations.find(motivation => motivation.note?.trim() === words) ?? words
}

/**
 * Shades at an edge of the list beyond which there is more to scroll to.
 * Each is hidden under a cover of the paper's colour that scrolls along
 * with the list, and so moves off the shade once the list reaches past it.
 */
const scrollShades = (paper: string) => [
    `linear-gradient(${paper} 30%, ${alpha(paper, 0)}) top / 100% 32px no-repeat local`,
    `linear-gradient(${alpha(paper, 0)}, ${paper} 70%) bottom / 100% 32px no-repeat local`,
    'radial-gradient(farthest-side at 50% 0, rgba(0, 0, 0, 0.15), transparent) top / 100% 12px no-repeat scroll',
    'radial-gradient(farthest-side at 50% 100%, rgba(0, 0, 0, 0.15), transparent) bottom / 100% 12px no-repeat scroll',
].join(', ')

const countOf = (n: number) => n === 0 ? 'no edits' : n === 1 ? '1 edit' : `${n} edits`

/** Stands for the new reason among the choices. */
const NEW = 'new'

interface MotivateDialogProps {
    /** The version the edits belong to, whose motivations are offered. */
    version: Version
    /** What the version is called. */
    name: string
    /** The edits to motivate. */
    editIds: readonly string[]
    /** An existing motivation to reuse, or the note of a new one. */
    onDone: (motivation: Motivation | string) => void
    onClose: () => void
}

/**
 * Why the selected edits were made: one of the reasons the version
 * already gives, or a new one. The reasons are listed in full, since
 * they are often whole sentences, each with how many edits give it.
 */
export const MotivateDialog = ({ version, name, editIds, onDone, onClose }: MotivateDialogProps) => {
    const { motivations } = version
    const uses = usesOf(version)
    const shared = sharedMotivation(version, editIds)

    const [choice, setChoice] = useState(shared?.id ?? NEW)
    const [note, setNote] = useState('')

    const reason = choice === NEW
        ? reasonFor(motivations, note)
        : motivations.find(motivation => motivation.id === choice)

    // On a radio as in the field, so that the reason chosen by keyboard
    // is given by keyboard as well. Shift+Enter still breaks a line.
    const doneOnEnter = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' || event.shiftKey) return
        event.preventDefault()
        if (reason) onDone(reason)
    }

    const question = editIds.length === 1
        ? 'Why was the selected edit made?'
        : `Why were the ${editIds.length} selected edits made?`

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
            <DialogTitle>Motivate</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    {question} Choose a reason {name} already gives,
                    or state a new one.
                </DialogContentText>
                <RadioGroup
                    value={choice}
                    onChange={(_, value) => setChoice(value)}
                    onKeyDown={doneOnEnter}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
                >
                    {motivations.length > 0 && (
                        <>
                            <Box sx={theme => ({
                                maxHeight: 320,
                                overflowY: 'auto',
                                py: 0.5,
                                background: scrollShades(theme.palette.background.paper)
                            })}>
                                {motivations.map(motivation => (
                                    <FormControlLabel
                                        key={motivation.id}
                                        value={motivation.id}
                                        control={<Radio size='small' autoFocus={motivation.id === shared?.id} />}
                                        onDoubleClick={() => onDone(motivation)}
                                        label={
                                            <>
                                                <Box component='span' sx={{ flex: 1 }}>
                                                    {motivation.note || 'No note'}
                                                </Box>
                                                <Box component='span' sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                                    {countOf(uses.get(motivation.id) ?? 0)}
                                                </Box>
                                            </>
                                        }
                                        slotProps={{
                                            typography: {
                                                variant: 'body2',
                                                sx: { flex: 1, display: 'flex', gap: 2, py: 1 }
                                            }
                                        }}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            mx: 0,
                                            pl: 1,
                                            pr: 2,
                                            bgcolor: choice === motivation.id ? 'action.selected' : undefined,
                                            '&:hover': { bgcolor: choice === motivation.id ? 'action.selected' : 'action.hover' }
                                        }}
                                    />
                                ))}
                            </Box>
                            <Divider />
                        </>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', pl: 1, pr: 2, py: 0.5 }}>
                        <Radio
                            size='small'
                            value={NEW}
                            slotProps={{ input: { 'aria-label': 'New reason' } }}
                        />
                        <TextField
                            fullWidth
                            multiline
                            maxRows={4}
                            size='small'
                            variant='standard'
                            placeholder='A new reason'
                            autoFocus={!shared}
                            value={note}
                            onFocus={() => setChoice(NEW)}
                            onChange={event => setNote(event.target.value)}
                            sx={{ mt: 0.75 }}
                        />
                    </Box>
                </RadioGroup>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' disabled={!reason} onClick={() => reason && onDone(reason)}>
                    Motivate
                </Button>
            </DialogActions>
        </Dialog>
    )
}
