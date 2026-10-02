import { useContext, useEffect, useState } from "react"
import { ContentCopy, Download, FormatQuote } from "@mui/icons-material"
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Link,
    Stack,
    Tab,
    Tabs,
    Tooltip,
    Typography
} from "@mui/material"
import { EditionContext } from "../edition/EditionContext"
import { asBibLaTeX, asRis, asText, Citation, longDate, partNamed } from "../edition/citation"
import { Commit, commitOf, PublicationContext } from "../edition/publication"
import { downloadFile } from "./downloadFile"
import { useSnackbar } from "./SnackbarContext"

type Format = 'text' | 'biblatex' | 'ris'

const formats: Record<Format, { label: string, write: (citation: Citation) => string, file?: { extension: string, type: string } }> = {
    text: { label: 'Text', write: asText },
    biblatex: { label: 'BibLaTeX', write: asBibLaTeX, file: { extension: 'bib', type: 'application/x-bibtex' } },
    ris: { label: 'RIS', write: asRis, file: { extension: 'ris', type: 'application/x-research-info-systems' } }
}

/** What is known of the commit holding what the desk shows. */
type Lookup =
    | { state: 'not published' }
    | { state: 'asking' }
    | { state: 'found', commit: Commit }
    | { state: 'not found' }
    | { state: 'unreachable' }

/** Asks once the dialog is open, so that GitHub is asked only by those who cite. */
const useCommit = (open: boolean): Lookup => {
    const publication = useContext(PublicationContext)
    const [answer, setAnswer] = useState<{ blob: string, lookup: Lookup }>()

    useEffect(() => {
        const blob = publication?.blob
        if (!open || !publication || !blob) return

        let current = true
        const answered = (lookup: Lookup) => { if (current) setAnswer({ blob, lookup }) }
        commitOf(publication)
            .then(commit => answered(commit ? { state: 'found', commit } : { state: 'not found' }))
            .catch(() => answered({ state: 'unreachable' }))
        return () => { current = false }
    }, [open, publication])

    if (!publication?.blob) return { state: 'not published' }
    return answer?.blob === publication.blob ? answer.lookup : { state: 'asking' }
}

/** What the reader is told of the commit, and why none is named where none is. */
const CommitLine = ({ lookup }: { lookup: Lookup }) => {
    switch (lookup.state) {
        case 'asking':
            return (
                <Stack direction='row' spacing={1} alignItems='center'>
                    <CircularProgress size={12} />
                    <span>Looking up the commit on GitHub…</span>
                </Stack>
            )
        case 'found':
            return (
                <span>
                    Commit{' '}
                    <Link href={lookup.commit.url} target='_blank' rel='noreferrer'>
                        {lookup.commit.sha.slice(0, 7)}
                    </Link>
                    {' '}of {longDate(lookup.commit.date)}, which holds exactly what is shown here.
                </span>
            )
        case 'not found':
            return <span>None of the latest commits holds what is shown here, so the citation names none.</span>
        case 'unreachable':
            return <span>GitHub could not be reached, so the citation names no commit.</span>
        case 'not published':
            return <span>This edition was not read from where it is published, so the citation names no commit.</span>
    }
}

interface CiteProps {
    /** The IRI of what the desk shows, or nothing where it shows the edition as a whole. */
    reference?: string
    /** The id of what the desk shows. */
    entity?: string
}

/**
 * Cites what the desk shows: by its IRI, which also opens the desk here
 * again, under the version of the edition and the commit whose file the
 * reader saw.
 */
export const Cite = ({ reference, entity }: CiteProps) => {
    const { edition } = useContext(EditionContext)
    const { setMessage } = useSnackbar()
    const [open, setOpen] = useState(false)
    const [format, setFormat] = useState<Format>('text')
    const lookup = useCommit(open)

    // Only an edition with a base has IRIs; one being written has none yet.
    const iri = reference ?? (edition?.base || undefined)

    const copy = async (text: string, what: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setMessage(`Copied ${what}`)
        }
        catch {
            // Denied, or no clipboard at all outside a secure context.
            setMessage('Could not reach the clipboard')
        }
    }

    const citation: Citation | undefined = edition && iri
        ? {
            edition,
            part: entity ? partNamed(edition, entity) : undefined,
            iri,
            commit: lookup.state === 'found' ? lookup.commit : undefined,
            accessed: new Date()
        }
        : undefined

    const { write, file, label } = formats[format]
    const written = citation && write(citation)

    return (
        <>
            <Tooltip title={iri ? 'Cite' : 'Nothing to cite yet'}>
                <span>
                    <IconButton
                        size='small'
                        disabled={!iri}
                        aria-label='Cite'
                        onClick={() => setOpen(true)}
                    >
                        <FormatQuote />
                    </IconButton>
                </span>
            </Tooltip>

            {citation && written && (
                <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='sm'>
                    <DialogTitle>Cite</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant='subtitle2'>
                                    {citation.part ?? 'The edition as a whole'}
                                </Typography>
                                <Stack direction='row' spacing={0.5} alignItems='center'>
                                    <Link href={citation.iri} variant='body2' sx={{ wordBreak: 'break-all' }}>
                                        {citation.iri}
                                    </Link>
                                    <IconButton
                                        size='small'
                                        aria-label='Copy the IRI'
                                        onClick={() => void copy(citation.iri, 'the IRI')}
                                    >
                                        <ContentCopy fontSize='inherit' />
                                    </IconButton>
                                </Stack>
                            </Box>

                            <Stack spacing={0.5}>
                                <Typography variant='body2' color='text.secondary'>
                                    {citation.edition.version
                                        ? `Version ${citation.edition.version} of the edition, published ${longDate(citation.edition.creation.publicationDate)}.`
                                        : `The edition states no version; it was published ${longDate(citation.edition.creation.publicationDate)}.`}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' component='div'>
                                    <CommitLine lookup={lookup} />
                                </Typography>
                            </Stack>

                            <Box>
                                <Tabs value={format} onChange={(_, value: Format) => setFormat(value)}>
                                    {Object.entries(formats).map(([value, { label }]) => (
                                        <Tab key={value} value={value} label={label} />
                                    ))}
                                </Tabs>
                                <Box
                                    component={format === 'text' ? 'p' : 'pre'}
                                    sx={{
                                        margin: 0,
                                        marginTop: 1.5,
                                        padding: 1.5,
                                        borderRadius: 1,
                                        background: 'rgba(0, 0, 0, 0.04)',
                                        fontFamily: format === 'text' ? 'inherit' : 'monospace',
                                        fontSize: format === 'text' ? '0.95rem' : '0.8rem',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        userSelect: 'text'
                                    }}
                                >
                                    {written}
                                </Box>
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        {file && (
                            <Button
                                startIcon={<Download />}
                                onClick={() => downloadFile(`citation.${file.extension}`, written, file.type)}
                            >
                                Download
                            </Button>
                        )}
                        <Button
                            variant='contained'
                            startIcon={<ContentCopy />}
                            onClick={() => void copy(written, `the citation as ${label}`)}
                        >
                            Copy
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    )
}
