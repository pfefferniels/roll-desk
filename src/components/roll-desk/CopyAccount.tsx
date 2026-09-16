import { Link, Stack, Typography } from "@mui/material"
import { FeatureSource, sourceLabels } from "linked-rolls"
import { useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { copyAccount } from "../../helpers/account"
import { dateStatement } from "../../helpers/dateStatement"
import { heldBy } from "../../helpers/heldBy"
import { webAddressOf } from "../../helpers/reasons"
import { AccountSection, HeldStatement } from "./Account"
import { EntityLink } from "./EntityLink"
import { NoteText } from "./NoteText"
import { ReservationNotes } from "./Reservations"

/** What a copy's features were read from, and who read it, with what and when. */
const SourceAccount = ({ source }: { source: FeatureSource }) => (
    <>
        <HeldStatement>{sourceLabels[source.kind]}</HeldStatement>
        {source.actor && (
            <HeldStatement belief={source.actor['@annotation']?.belief}>by {source.actor.name}</HeldStatement>
        )}
        {source.device && <HeldStatement>with {source.device.name}</HeldStatement>}
        {source.instrument && (
            <HeldStatement belief={source.instrument['@annotation']?.belief}>on {source.instrument.name}</HeldStatement>
        )}
        {(source.software ?? []).map(software => (
            <HeldStatement key={`${software.name}-${software.version}`}>
                using {[software.name, software.version].filter(Boolean).join(' ')}
            </HeldStatement>
        ))}
        {source.date && (
            <HeldStatement belief={source.date['@annotation']?.belief}>
                {dateStatement(source.date)}
            </HeldStatement>
        )}
        {source.output && (
            <HeldStatement>
                {webAddressOf(source.output)
                    ? <Link href={source.output} target='_blank' rel='noreferrer' sx={{ overflowWrap: 'anywhere' }}>{source.output}</Link>
                    : source.output}
            </HeldStatement>
        )}
        {source.note && (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                <NoteText note={source.note} />
            </Typography>
        )}
    </>
)

/** What the edition states of a copy and why: where its features come from, and which versions it carries. */
export const CopyAccount = ({ copyId }: { copyId: string }) => {
    const { view } = useContext(EditionContext)
    const account = view && copyAccount(view, copyId)
    if (!account) return null

    const { copy, carriages, reservations } = account

    return (
        <Stack spacing={1}>
            <Typography variant='caption' color='text.secondary'>
                {copy.keeper ? `held by ${heldBy(copy)}` : 'keeper unknown'}
            </Typography>

            {copy.readFrom && (
                <AccountSection title='Read from'>
                    <SourceAccount source={copy.readFrom} />
                </AccountSection>
            )}

            <AccountSection title='Carries'>
                {carriages.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>Nothing is known of what it carries.</Typography>
                )}
                {carriages.map(carriage => (
                    <HeldStatement key={carriage.version} belief={carriage.belief}>
                        <EntityLink id={carriage.version} />
                        {carriage.by === 'carriers' ? ', by its perforations' : ', by statement'}
                    </HeldStatement>
                ))}
            </AccountSection>

            {reservations.length > 0 && (
                <AccountSection title='Reservations'>
                    <ReservationNotes reservations={reservations} />
                </AccountSection>
            )}
        </Stack>
    )
}
