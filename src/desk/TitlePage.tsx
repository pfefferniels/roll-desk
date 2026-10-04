import { Create } from "@mui/icons-material"
import { Box, IconButton, Stack, Typography } from "@mui/material"
import { Editor } from "linked-rolls"
import { useContext } from "react"
import { Arguable } from "../accounts/Arguable"
import { EditionContext } from "../edition/EditionContext"
import { dateStatement } from "../edition/dateStatement"

const namedEditors = (editors: Editor[] = []) =>
    editors.map(editor => `${editor.name} (${editor.role})`).join(', ')

const counted = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`

interface TitlePageProps {
    /** Opens the edition's metadata for editing; left out where the edition is only read. */
    onEdit?: () => void
}

/**
 * What the desk shows with nothing on it: the edition's title page. A
 * reader arrives at it and returns to it by the title over the panel.
 */
export const TitlePage = ({ onEdit }: TitlePageProps) => {
    const { edition } = useContext(EditionContext)
    if (!edition) return null

    const editorLine = namedEditors(edition.creation.editors)

    return (
        <Box sx={{ px: 6, pt: '20vh', pb: 6, maxWidth: '36rem' }}>
            <Stack direction='row' alignItems='flex-start' spacing={1}>
                <Typography variant='h4' component='h1' sx={{ flexGrow: 1 }}>
                    {edition.title}
                </Typography>
                {onEdit && (
                    <IconButton aria-label='Edit the metadata' onClick={onEdit}>
                        <Create />
                    </IconButton>
                )}
            </Stack>

            <Typography variant='subtitle1' component='div' sx={{ mt: 1 }}>
                {edition.roll.catalogueNumber}{' '}
                <Arguable path={['roll', 'recordingEvent', 'date'] as const}>
                    ({dateStatement(edition.roll.recordingEvent.date)})
                </Arguable>
            </Typography>

            {editorLine && (
                <Typography variant='subtitle1'>
                    ed. {editorLine}
                </Typography>
            )}

            <Typography variant='body2' color='text.secondary' sx={{ mt: 3 }}>
                The edition holds {counted(edition.versions.length, 'version', 'versions')} and{' '}
                {counted(edition.copies.length, 'copy', 'copies')}. Choose a version in the stemma,
                or a copy among the sources, to lay it on the desk.
            </Typography>
        </Box>
    )
}
