import { useContext, useEffect, useState } from "react"
import { ContentCopy, FormatQuote } from "@mui/icons-material"
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from "@mui/material"
import { EditionContext } from "../edition/EditionContext"
import { referenceOf, shortPathOf } from "../edition/addresses"
import { Citation, citationIn, Language, partNamed } from "../edition/citation"
import { Commit, commitOf, PublicationContext } from "../edition/publication"
import { useSnackbar } from "./SnackbarContext"

const languages: { language: Language, label: string }[] = [
    { language: 'en', label: 'English' },
    { language: 'de', label: 'Deutsch' }
]

/**
 * The commit holding what the desk shows, asked of GitHub once the
 * dialog is open, so that only those who cite ask. Nothing until it is
 * known, and nothing where it cannot be.
 */
const useCommit = (open: boolean): Commit | undefined => {
    const publication = useContext(PublicationContext)
    const [found, setFound] = useState<{ blob: string, commit?: Commit }>()

    useEffect(() => {
        const blob = publication?.blob
        if (!open || !publication || !blob) return

        let current = true
        commitOf(publication)
            .then(commit => { if (current) setFound({ blob, commit }) })
            .catch(() => { /* cited without a commit */ })
        return () => { current = false }
    }, [open, publication])

    return found && found.blob === publication?.blob ? found.commit : undefined
}

interface CiteProps {
    /** The id of what the desk shows, or nothing where it shows the edition as a whole. */
    entity?: string
}

/** Suggests how to cite what the desk shows, in English and in German. */
export const Cite = ({ entity }: CiteProps) => {
    const { edition } = useContext(EditionContext)
    const { setMessage } = useSnackbar()
    const [open, setOpen] = useState(false)
    const commit = useCommit(open)

    // Only an edition with a base has addresses; one being written has none yet.
    const citation: Citation | undefined = edition?.base
        ? {
            edition,
            part: entity ? partNamed(edition, entity) : undefined,
            url: entity ? referenceOf(shortPathOf(edition, entity), edition.base) : edition.base,
            commit,
            accessed: new Date()
        }
        : undefined

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setMessage('Copied the citation')
        }
        catch {
            // Denied, or no clipboard at all outside a secure context.
            setMessage('Could not reach the clipboard')
        }
    }

    return (
        <>
            <Tooltip title={citation ? 'Cite' : 'Nothing to cite yet'}>
                <span>
                    <IconButton
                        size='small'
                        disabled={!citation}
                        aria-label='Cite'
                        onClick={() => setOpen(true)}
                    >
                        <FormatQuote />
                    </IconButton>
                </span>
            </Tooltip>

            {citation && (
                <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='sm'>
                    <DialogTitle>Suggested citation</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2}>
                            {languages.map(({ language, label }) => {
                                const text = citationIn(language, citation)
                                return (
                                    <Box key={language}>
                                        <Typography variant='overline' color='text.secondary'>
                                            {label}
                                        </Typography>
                                        <Stack direction='row' spacing={1} alignItems='flex-start'>
                                            <Typography
                                                variant='body2'
                                                lang={language}
                                                sx={{
                                                    flex: 1,
                                                    padding: 1.5,
                                                    borderRadius: 1,
                                                    background: 'rgba(0, 0, 0, 0.04)',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {text}
                                            </Typography>
                                            <Tooltip title='Copy'>
                                                <IconButton
                                                    aria-label={`Copy the ${label} citation`}
                                                    onClick={() => void copy(text)}
                                                >
                                                    <ContentCopy fontSize='small' />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Box>
                                )
                            })}
                        </Stack>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
