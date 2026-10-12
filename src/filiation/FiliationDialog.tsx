import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Stack, Typography, useMediaQuery, useTheme } from "@mui/material"
import { Edition, StemmaProposal } from "linked-rolls"
import { produce } from "immer"
import { useContext, useEffect, useRef, useState } from "react"
import { EditionContext } from "../edition/EditionContext"
import { useSnackbar } from "../desk/SnackbarContext"
import { adoption, asSentence, defaultTyping, FiliationReply, FiliationRequest, optionsOf } from "./filiation"
import { FiliationFields } from "./FiliationFields"
import { ProposalAccount } from "./ProposalAccount"

/** Where a proposal stands, for the edition it was asked for. */
type Outcome = { from: Edition } & (
    | { running: true }
    | { refusal: string }
    | { proposal: StemmaProposal, preview: Edition }
)

const reasonOf = (error: unknown): string => error instanceof Error ? error.message : String(error)

interface FiliationDialogProps {
    onClose: () => void
}

/**
 * Proposes a stemma from the copies alone and sets it against the one
 * the edition states, to be adopted as a whole or left, with the edits
 * of its versions where they are proposed too. The search runs in a
 * worker, which is let go of when the dialog closes.
 */
export const FiliationDialog = ({ onClose }: FiliationDialogProps) => {
    const { edition, apply } = useContext(EditionContext)
    const { setMessage } = useSnackbar()
    const theme = useTheme()
    const onPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })

    const [typed, setTyped] = useState(defaultTyping)
    const [pin, setPin] = useState(true)
    const [withEdits, setWithEdits] = useState(true)
    const [outcome, setOutcome] = useState<Outcome>()
    const worker = useRef<Worker>(null)

    useEffect(() => () => worker.current?.terminate(), [])

    const read = optionsOf(typed, pin)
    const running = outcome !== undefined && 'running' in outcome
    const proposed = outcome && 'proposal' in outcome ? outcome : undefined
    /** Whether the edition has changed since the proposal was made for it, which it would then no longer fit. */
    const outdated = !!proposed && proposed.from !== edition

    const propose = () => {
        if (!edition || 'invalid' in read) return

        worker.current?.terminate()
        const started = new Worker(new URL('./filiation.worker.ts', import.meta.url), { type: 'module' })
        worker.current = started
        const settle = (settled: Outcome) => {
            started.terminate()
            if (worker.current === started) worker.current = null
            setOutcome(settled)
        }

        started.onmessage = ({ data }: MessageEvent<FiliationReply>) => {
            if ('refusal' in data) {
                settle({ from: edition, refusal: data.refusal })
                return
            }
            try {
                settle({ from: edition, proposal: data.proposal, preview: produce(edition, adoption(data.proposal, withEdits)) })
            }
            catch (error) {
                settle({ from: edition, refusal: `The proposal could not be adopted: ${reasonOf(error)}` })
            }
        }
        started.onerror = event => {
            event.preventDefault()
            settle({ from: edition, refusal: event.message || 'The search stopped without an answer' })
        }

        setOutcome({ from: edition, running: true })
        started.postMessage({ edition, options: read.options } satisfies FiliationRequest)
    }

    /** Proposes the edits with the stemma or leaves them, the preview of a proposal made already following. */
    const proposeEdits = (proposing: boolean) => {
        setWithEdits(proposing)
        if (!proposed) return
        try {
            setOutcome({ ...proposed, preview: produce(proposed.from, adoption(proposed.proposal, proposing)) })
        }
        catch (error) {
            setOutcome({ from: proposed.from, refusal: `The proposal could not be adopted: ${reasonOf(error)}` })
        }
    }

    const adopt = () => {
        if (!proposed || outdated) return

        apply(adoption(proposed.proposal, withEdits))
        setMessage(withEdits
            ? 'Adopted the proposed stemma and its edits. Undo takes them back.'
            : 'Adopted the proposed stemma. Undo takes it back.')
        onClose()
    }

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='lg' fullScreen={onPhone} scroll='paper'>
            <DialogTitle>Filiation</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <DialogContentText>
                        Proposes a stemma from the copies alone. Every stemma their systems admit is
                        scored by what it has to let arise and be lost, and the least costly is set
                        against the edition&apos;s own. Nothing changes until it is adopted.
                    </DialogContentText>

                    <FiliationFields
                        typed={typed}
                        onType={(field, text) => setTyped(before => ({ ...before, [field]: text }))}
                        pin={pin}
                        onPin={setPin}
                        withEdits={withEdits}
                        onWithEdits={proposeEdits}
                        onReset={() => {
                            setTyped(defaultTyping())
                            setPin(true)
                            proposeEdits(true)
                        }}
                        disabled={running}
                    />

                    {running && (
                        <Stack spacing={0.5}>
                            <LinearProgress />
                            <Typography variant='caption' color='text.secondary'>
                                Scoring every stemma of the copies. With six copies this takes a few seconds.
                            </Typography>
                        </Stack>
                    )}

                    {outcome && 'refusal' in outcome && (
                        <Alert severity='warning'>{asSentence(outcome.refusal)}</Alert>
                    )}

                    {outdated && (
                        <Alert severity='info'>The edition has changed since this stemma was proposed. Propose again to adopt one.</Alert>
                    )}

                    {proposed && (
                        <ProposalAccount edition={proposed.from} proposal={proposed.proposal} preview={proposed.preview} withEdits={withEdits} />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                <Button variant='outlined' disabled={running || 'invalid' in read} onClick={propose}>
                    {proposed ? 'Propose Again' : 'Propose'}
                </Button>
                <Button variant='contained' disabled={!proposed || outdated || running} onClick={adopt}>
                    Adopt
                </Button>
            </DialogActions>
        </Dialog>
    )
}
