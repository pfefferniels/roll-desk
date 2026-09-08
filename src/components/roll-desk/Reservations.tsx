import { ReportGmailerrorred } from "@mui/icons-material"
import { Alert, Box, Stack, Tooltip, Typography } from "@mui/material"
import { reservationsAbout, RollCopy } from "linked-rolls"

/**
 * A reservation is worked out from what a copy states about itself
 * and is never stored, so filling the gap it names makes it go away.
 */
const notes = (copy: RollCopy): string[] =>
    reservationsAbout(copy).map(reservation => reservation.note)

/** The reservations about a copy as a mark beside it, or nothing where there are none. */
export const ReservationMark = ({ copy }: { copy: RollCopy }) => {
    const found = notes(copy)
    if (!found.length) return null

    return (
        <Tooltip
            title={
                <Stack component='ul' sx={{ m: 0, pl: 2 }} spacing={0.5}>
                    {found.map(note => <li key={note}>{note}</li>)}
                </Stack>
            }
        >
            <ReportGmailerrorred fontSize='small' color='warning' sx={{ verticalAlign: 'middle' }} />
        </Tooltip>
    )
}

/** The reservations about a copy spelled out, for a dialog that edits it. */
export const ReservationList = ({ copy }: { copy: RollCopy }) => {
    const found = notes(copy)

    if (!found.length) {
        return (
            <Alert severity='success' variant='outlined'>
                Nothing is left open about where this copy's features come from.
            </Alert>
        )
    }

    return (
        <Alert severity='info' variant='outlined' icon={<ReportGmailerrorred fontSize='small' />}>
            <Typography variant='body2'>What the edition cannot vouch for in this copy:</Typography>
            <Box component='ul' sx={{ m: 0, mt: 0.5, pl: 2 }}>
                {found.map(note => (
                    <Typography component='li' variant='caption' key={note}>{note}</Typography>
                ))}
            </Box>
        </Alert>
    )
}
