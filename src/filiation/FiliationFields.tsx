import { Box, Button, Checkbox, FormControlLabel, FormHelperText, Stack, TextField } from "@mui/material"
import { AccountSection } from "../accounts/Account"
import { OptionField, parseAmount, TypedOptions } from "./filiation"

/** What each amount is called, and what it counts, in a line. */
const fields: { field: OptionField, label: string, help: string }[] = [
    { field: 'sameText', label: 'Same text within (readings)', help: 'Copies of one system that differ in no more readings carry one version.' },
    { field: 'gain', label: 'Gain', help: 'A reading arising, ten times a loss: one addition is seldom made twice.' },
    { field: 'lostState', label: 'Lost state', help: 'A lost version, so that one is posited only where shared additions call for it.' },
    { field: 'redundantLoss', label: 'Redundant loss', help: 'A reading that did nothing, lost, counts for this share of a loss.' },
    { field: 'transferLoss', label: 'Loss on a transfer', help: 'What a re-cut for another system lacks counts for this share of a loss.' },
    { field: 'copyDeviation', label: 'Deviation of a copy', help: 'A copy lacking a reading of the version it carries; ∞ holds it to its version.' },
    { field: 'movedWithin', label: 'Moved within (mm)', help: 'How near a reading of the same kind across the root makes one a moved reading.' },
    { field: 'margin', label: 'Margin (mm)', help: 'How far beyond its text or a tear a copy cannot say what it lacks.' }
]

interface FiliationFieldsProps {
    typed: TypedOptions
    onType: (field: OptionField, text: string) => void
    /** Whether the edits the editor wrote hold their versions. */
    pin: boolean
    onPin: (pin: boolean) => void
    /** Puts every option back to where it started. */
    onReset: () => void
    disabled?: boolean
}

/**
 * What a proposal is computed with. The costs and distances start at the
 * values the edition of WM 225 is reproduced with, and fold away, since
 * they are seldom changed.
 */
export const FiliationFields = ({ typed, onType, pin, onPin, onReset, disabled }: FiliationFieldsProps) => (
    <Stack spacing={1}>
        <Box>
            <FormControlLabel
                control={<Checkbox checked={pin} disabled={disabled} onChange={event => onPin(event.target.checked)} />}
                label='Keep the edits I wrote'
            />
            <FormHelperText sx={{ mt: 0 }}>
                An edit no collation wrote holds its version to what it inserts and deletes, as far as the copies allow.
            </FormHelperText>
        </Box>

        <AccountSection
            title='Costs and distances'
            hint='What the search counts against a stemma, and how near readings must lie to count as one.'
            folded
        >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 1 }}>
                {fields.map(({ field, label, help }) => {
                    const invalid = parseAmount(field, typed[field]) === undefined
                    return (
                        <TextField
                            key={field}
                            label={label}
                            size='small'
                            disabled={disabled}
                            value={typed[field]}
                            error={invalid}
                            helperText={invalid ? (field === 'sameText' ? 'A whole number of 0 or more is wanted here.' : 'An amount of 0 or more is wanted here.') : help}
                            slotProps={{ htmlInput: { inputMode: field === 'sameText' ? 'numeric' : 'decimal' } }}
                            onChange={event => onType(field, event.target.value)}
                        />
                    )
                })}
            </Box>
            <Button size='small' disabled={disabled} onClick={onReset} sx={{ alignSelf: 'flex-start' }}>
                Reset
            </Button>
        </AccountSection>
    </Stack>
)
