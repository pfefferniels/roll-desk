import { useState } from "react"
import { InfoOutlined } from "@mui/icons-material"
import { Dialog, DialogContent, DialogTitle, IconButton, Link, Stack, Tooltip, Typography } from "@mui/material"
import { version as linkedRollsVersion } from "linked-rolls/package.json"
import { build, buildLine, sourceOf } from "./build"

const repository = 'https://github.com/pfefferniels/roll-desk'

/** Says what the desk is, who made it, which build is running and under which licence. */
export const About = () => {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Tooltip title='About Roll Desk'>
                <IconButton
                    size='small'
                    aria-label='About Roll Desk'
                    onClick={() => setOpen(true)}
                >
                    <InfoOutlined />
                </IconButton>
            </Tooltip>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='sm'>
                <DialogTitle>Roll Desk</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5}>
                        <Typography variant='body2'>
                            An editor and viewer for critical editions of piano rolls:
                            it collates the copies of a roll, places the versions they
                            carry in a stemma, and shows the editorial assumptions an
                            edition rests on, each with its certainty and reasons.
                        </Typography>
                        <Typography variant='body2'>
                            The editorial principles behind it are set out in the
                            dissertation <i>Grünfelds Geist</i> (Niels Pfeffer,
                            Tübingen 2026), chapter “Varianten”.
                        </Typography>
                        <Typography variant='body2'>
                            Space plays the version on the desk and stops it. Tab goes
                            through the versions in the stemma and Enter opens one. On
                            a version’s roll, the arrow keys go from symbol to symbol,
                            with Shift from edit to edit, Home and End to the first and
                            the last, Page Up and Page Down a view further, and Enter
                            selects where they stand; + and − stretch and shrink the
                            roll. Escape clears the selection.
                        </Typography>
                        <Typography variant='body2'>
                            By Niels Pfeffer. Released under the{' '}
                            <Link href={`${repository}/blob/main/LICENSE`} target='_blank' rel='noopener'>
                                MIT licence
                            </Link>.
                        </Typography>
                        <Typography variant='body2'>
                            {build
                                ? <>Build{' '}
                                    <Link href={sourceOf(build)} target='_blank' rel='noopener'>
                                        {buildLine(build)}
                                    </Link>
                                </>
                                : 'Build not known'}
                            , on{' '}
                            <Link href='https://github.com/pfefferniels/linked-rolls' target='_blank' rel='noopener'>
                                linked-rolls
                            </Link>{' '}
                            {linkedRollsVersion}. The edition format is documented at{' '}
                            <Link href='https://pfefferniels.github.io/linked-rolls/' target='_blank' rel='noopener'>
                                pfefferniels.github.io/linked-rolls
                            </Link>.
                        </Typography>
                        <Typography variant='body2'>
                            The piano sounds with the Salamander Grand Piano samples by
                            Alexander Holm (CC BY 3.0), loaded from tambien.github.io.
                            Scans are loaded from where the edition names them.
                        </Typography>
                        <Typography variant='body2'>
                            <Link href={repository} target='_blank' rel='noopener'>Source</Link>
                            {' · '}
                            <Link href={`${repository}/issues`} target='_blank' rel='noopener'>Report a problem</Link>
                        </Typography>
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    )
}
