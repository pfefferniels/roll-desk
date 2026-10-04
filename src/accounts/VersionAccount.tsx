import { Box, Stack, Typography } from "@mui/material"
import { CollationTolerance, nameOf, ObjectAssumption, trackerBarOf } from "linked-rolls"
import { useContext } from "react"
import { EditionContext } from "../edition/EditionContext"
import { versionAccount } from "../edition/account"
import { windowAtEnds } from "../edition/collationTolerance"
import { versionLabel } from "../edition/names"
import { dateStatement } from "../edition/dateStatement"
import { DerivationScatter } from "./DerivationScatter"
import { AccountSection, HeldStatement } from "./Account"
import { EntityLink } from "./EntityLink"
import { Name } from "./Name"
import { ReservationNotes } from "./Reservations"

/**
 * The window the two texts were collated in. It decides what counts as one
 * reading rather than two, so a reader weighing a difference should see it.
 */
const CollatedAt = ({ tolerance }: { tolerance: ObjectAssumption<CollationTolerance> }) => {
    const ends = windowAtEnds(tolerance)

    return (
        <Box sx={{ pl: 1.5 }}>
            <HeldStatement belief={tolerance['@annotation']?.belief}>
                <Typography variant='caption' color='text.secondary'>
                    collated at onset {ends.from}, end {ends.to}
                </Typography>
            </HeldStatement>
        </Box>
    )
}

/** What the edition states of a version and why: where it derives from, how it was made, what bears witness to it. */
export const VersionAccount = ({ versionId }: { versionId: string }) => {
    const { edition } = useContext(EditionContext)
    const account = edition && versionAccount(edition, versionId)
    if (!edition || !account) return null

    const { version, derivations, witnesses, indirect, reservations } = account
    const { creation } = version

    return (
        <Stack spacing={1}>
            <div>
                <Typography variant='subtitle2'>Version {versionLabel(edition, version.id)}</Typography>
                <Typography variant='caption' color='text.secondary'>
                    {trackerBarOf(version.system)?.name ?? nameOf(version.system)}
                </Typography>
            </div>

            {derivations.length > 0 && (
                <AccountSection title='Derived from' folded>
                    {derivations.map(({ parent, principal, belief, collationTolerance }) => (
                        <div key={parent}>
                            <HeldStatement belief={belief}>
                                {principal
                                    ? <EntityLink id={parent} />
                                    : <>also <EntityLink id={parent} />, as a hypothesis</>}
                            </HeldStatement>
                            {collationTolerance && (
                                <CollatedAt tolerance={collationTolerance} />
                            )}
                            {principal && <DerivationScatter versionId={version.id} />}
                        </div>
                    ))}
                </AccountSection>
            )}

            {creation && (
                <AccountSection title='Made'>
                    {creation.procedure && <HeldStatement>{nameOf(creation.procedure)}</HeldStatement>}
                    {creation.actor && (
                        <HeldStatement belief={creation.actor['@annotation']?.belief}>
                            by <Name named={creation.actor} />
                        </HeldStatement>
                    )}
                    {creation.date && (
                        <HeldStatement belief={creation.date['@annotation']?.belief}>
                            {dateStatement(creation.date)}
                        </HeldStatement>
                    )}
                </AccountSection>
            )}

            <AccountSection title='Witnesses'>
                {/* Where only indirect witnesses are left, the reservation says so. */}
                {witnesses.length === 0 && indirect.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>No copy bears witness to it.</Typography>
                )}
                {witnesses.map(witness => (
                    <HeldStatement key={witness.copy} belief={witness.belief}>
                        <EntityLink id={witness.copy} />
                        {witness.by === 'carriers' ? ', by its perforations' : ', by statement'}
                    </HeldStatement>
                ))}
                {indirect.map(witness => (
                    <Typography key={witness.copy} variant='body2' color='text.secondary'>
                        <EntityLink id={witness.copy} />, through <EntityLink id={witness.through} />
                    </Typography>
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
