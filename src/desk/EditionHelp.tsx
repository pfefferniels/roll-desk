import { Typography } from "@mui/material"
import { LegendPopover } from "../stemma/Legend"

const paragraph = { maxWidth: 320, fontSize: 'small' } as const

/**
 * What the title page offers under its help button: what the edition is
 * and where its editorial principles are set out. The stemma and the
 * sources say what they are on their tabs, and the drawings explain
 * themselves once one is open, see `RollLegend`.
 */
export const EditionHelp = () => (
    <LegendPopover label='About this edition'>
        <Typography variant='body2' sx={paragraph}>
            A critical edition of a piano roll. Its editorial principles are set
            out in the dissertation{' '}
            <i>Grünfelds Geist</i> (Niels Pfeffer, Tübingen 2026), chapter
            “Varianten”.
        </Typography>
    </LegendPopover>
)
