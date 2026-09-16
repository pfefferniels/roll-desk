import { Stack, Typography } from "@mui/material"
import { trackerBarOf } from "linked-rolls"
import { useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { describeEdit, versionAccount } from "../../helpers/account"
import { versionLabel } from "../../helpers/names"
import { dateStatement } from "../../helpers/dateStatement"
import { AccountSection, HeldStatement } from "./Account"
import { EntityLink } from "./EntityLink"
import { ReservationNotes } from "./Reservations"

/** What the edition states of a version and why: where it derives from, how it was made, what bears witness to it. */
export const VersionAccount = ({ versionId }: { versionId: string }) => {
    const { view } = useContext(EditionContext)
    const account = view && versionAccount(view, versionId)
    if (!view || !account) return null

    const { version, derivations, witnesses, indirect, arguedEdits, reservations } = account
    const { creation } = version

    return (
        <Stack spacing={1}>
            <div>
                <Typography variant='subtitle2'>Version {versionLabel(view, version.id)}</Typography>
                <Typography variant='caption' color='text.secondary'>
                    {trackerBarOf(version.system)?.name ?? version.system.name}
                </Typography>
            </div>

            {derivations.length > 0 && (
                <AccountSection title='Derived from'>
                    {derivations.map(({ parent, principal, belief }) => (
                        <HeldStatement key={parent} belief={belief}>
                            {principal
                                ? <EntityLink id={parent} />
                                : <>also <EntityLink id={parent} />, as a hypothesis</>}
                        </HeldStatement>
                    ))}
                </AccountSection>
            )}

            {creation && (
                <AccountSection title='Made'>
                    {creation.procedure && <HeldStatement>{creation.procedure.name}</HeldStatement>}
                    {creation.actor && (
                        <HeldStatement belief={creation.actor['@annotation']?.belief}>
                            by {creation.actor.name}
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

            {arguedEdits.length > 0 && (
                <AccountSection title='Argued edits'>
                    {arguedEdits.map(edit => (
                        <HeldStatement key={edit.id} belief={edit['@annotation']?.belief}>
                            <EntityLink id={edit.id} label={describeEdit(edit, view)} />
                        </HeldStatement>
                    ))}
                </AccountSection>
            )}

            {reservations.length > 0 && (
                <AccountSection title='Reservations'>
                    <ReservationNotes reservations={reservations} />
                </AccountSection>
            )}
        </Stack>
    )
}
