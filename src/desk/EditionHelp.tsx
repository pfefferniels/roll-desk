import { Typography } from "@mui/material"
import { LegendPopover } from "../stemma/Legend"

const paragraph = { maxWidth: 320, fontSize: 'small' } as const

/**
 * What the title page offers under its help button: what the edition is,
 * how it is read, and where its editorial principles are set out. The
 * drawings explain themselves once one is open, see `RollLegend`.
 */
export const EditionHelp = () => (
    <LegendPopover label='About this edition'>
        <Typography variant='body2' sx={paragraph}>
            A critical edition of a piano roll. The stemma beside the title page
            draws the versions the roll went through; Sources lists the copies
            they are read from. Open either to read its roll.
        </Typography>
        <Typography variant='body2' sx={paragraph}>
            A roll has no running text to search. It is read along its length,
            and every version, copy and symbol has an address of its own.
        </Typography>
        <Typography variant='body2' sx={paragraph}>
            The editorial principles are set out in the dissertation{' '}
            <i>Grünfelds Geist</i> (Niels Pfeffer, Tübingen 2026), chapter
            “Varianten”.
        </Typography>
    </LegendPopover>
)
