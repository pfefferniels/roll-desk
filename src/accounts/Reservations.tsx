import { ReportGmailerrorred } from "@mui/icons-material"
import { Alert, Box, Typography } from "@mui/material"
import { Reservation, reservationsAbout, RollCopy } from "linked-rolls"

/**
 * What the edition cannot vouch for, a note to a line. A reservation is
 * worked out and never stored, so filling the gap it names makes it go away.
 */
export const ReservationNotes = ({ reservations }: { reservations: readonly Reservation<string>[] }) => (
    <Box component='ul' sx={{ m: 0, pl: 2 }}>
        {reservations.map(reservation => (
            <Typography component='li' variant='caption' key={reservation.type}>{reservation.note}</Typography>
        ))}
    </Box>
)

/** The reservations about a copy spelled out, for a dialog that edits it. */
export const ReservationList = ({ copy }: { copy: RollCopy }) => {
    const reservations = reservationsAbout(copy)

    if (!reservations.length) {
        return (
            <Alert severity='success' variant='outlined'>
                Nothing is left open about where this copy&apos;s features come from.
            </Alert>
        )
    }

    return (
        <Alert severity='info' variant='outlined' icon={<ReportGmailerrorred fontSize='small' />}>
            <Typography variant='body2'>What the edition cannot vouch for in this copy:</Typography>
            <Box sx={{ mt: 0.5 }}>
                <ReservationNotes reservations={reservations} />
            </Box>
        </Alert>
    )
}
