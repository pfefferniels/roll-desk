import { Create } from "@mui/icons-material"
import { Box, IconButton, Link, Stack, Typography } from "@mui/material"
import { Editor, Named } from "linked-rolls"
import { Fragment, ReactNode, useContext } from "react"
import { Arguable } from "../accounts/Arguable"
import { EditionContext } from "../edition/EditionContext"
import { dateStatement, day } from "../edition/dateStatement"
import { licenseName } from "../edition/licenses"

/** Stands where the edition states nothing. */
const missing = <Box component='span' sx={{ color: 'text.disabled' }}>—</Box>

/** A link that leaves the edition, opening in a tab of its own. */
const OutLink = ({ href, children }: { href: string, children: ReactNode }) => (
    <Link href={href} target='_blank' rel='noopener noreferrer'>
        {children}
    </Link>
)

/** The name, leading to its authority record where the edition gives one. */
const NameOf = ({ named }: { named: Named }) => {
    const [record] = named.sameAs.filter(uri => uri.trim())
    return record ? <OutLink href={record}>{named.name}</OutLink> : <>{named.name}</>
}

/** The editors, each with the part they took where it is more than editing as such. */
const Editors = ({ editors }: { editors: Editor[] }) => (
    <>
        {editors.map((editor, at) => (
            <Fragment key={at}>
                {at > 0 && ', '}
                <NameOf named={editor} />
                {editor.role !== 'editor' && ` (${editor.role})`}
            </Fragment>
        ))}
    </>
)

/** One statement of the title page: what it is about and what it says. */
const Field = ({ label, children }: { label: string, children?: ReactNode }) => (
    <>
        <Typography component='dt' variant='body2' color='text.secondary'>
            {label}
        </Typography>
        <Typography component='dd' variant='body2' sx={{ m: 0, overflowWrap: 'anywhere' }}>
            {children ?? missing}
        </Typography>
    </>
)

/** The statements about one thing, under its name. */
const Section = ({ title, children }: { title: string, children: ReactNode }) => (
    <Box component='section' sx={{ mt: 3 }}>
        <Typography variant='overline' component='h2' color='text.secondary' sx={{ lineHeight: 1.5 }}>
            {title}
        </Typography>
        <Box
            component='dl'
            sx={{
                display: 'grid',
                gridTemplateColumns: '9rem minmax(0, 1fr)',
                columnGap: 2,
                rowGap: 0.5,
                m: 0,
                mt: 0.5
            }}
        >
            {children}
        </Box>
    </Box>
)

interface TitlePageProps {
    /** Opens the edition's metadata for editing; left out where the edition is only read. */
    onEdit?: () => void
}

/**
 * What the desk shows with nothing on it: the edition's title page,
 * stating the roll it edits and the edition itself. A reader arrives at
 * it and returns to it by the title over the panel.
 */
export const TitlePage = ({ onEdit }: TitlePageProps) => {
    const { edition } = useContext(EditionContext)
    if (!edition) return null

    const { roll, creation } = edition
    const { recorded, place, date } = roll.recordingEvent
    const editors = creation.editors ?? []

    return (
        <Box sx={{ px: { xs: 2, sm: 6 }, pt: '15vh', pb: 6, maxWidth: '38rem' }}>
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

            <Section title='Roll'>
                <Field label='Catalogue number'>{roll.catalogueNumber.trim() || undefined}</Field>
                <Field label='Pianist'>
                    {recorded.pianist.name.trim() ? <NameOf named={recorded.pianist} /> : undefined}
                </Field>
                {recorded.playing.trim() && (
                    <Field label='Work'>
                        <OutLink href={recorded.playing}>{recorded.playing}</OutLink>
                    </Field>
                )}
                <Field label='Recorded'>
                    {place.name.trim() && <><NameOf named={place} />, </>}
                    <Arguable path={['roll', 'recordingEvent', 'date'] as const}>
                        {dateStatement(date)}
                    </Arguable>
                </Field>
            </Section>

            <Section title='Edition'>
                <Field label='Editors'>
                    {editors.length > 0 ? <Editors editors={editors} /> : undefined}
                </Field>
                <Field label='Publisher'>
                    {creation.publisher.name.trim() ? <NameOf named={creation.publisher} /> : undefined}
                </Field>
                <Field label='Version'>{edition.version?.trim() || undefined}</Field>
                <Field label='Published'>{day(creation.publicationDate)}</Field>
                <Field label='License'>
                    {edition.license ? <OutLink href={edition.license}>{licenseName(edition.license)}</OutLink> : undefined}
                </Field>
                <Field label='Address'>
                    {edition.base ? <OutLink href={edition.base}>{edition.base}</OutLink> : undefined}
                </Field>
            </Section>
        </Box>
    )
}
