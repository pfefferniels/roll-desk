import { TextField } from "@mui/material"
import { CollationTolerance, Millimeters } from "linked-rolls"
import { parseTolerance } from "../../helpers/collationTolerance"
import { useDraft } from "../../hooks/useDraft"

interface ToleranceFieldProps {
    label: string
    value: Millimeters
    onChange: (millimetres: Millimeters) => void
}

/** Keeps what was typed while it does not yet spell a tolerance. */
const ToleranceField = ({ label, value, onChange }: ToleranceFieldProps) => {
    const [typed, setTyped] = useDraft(String(value))

    return (
        <TextField
            label={label}
            type='number'
            fullWidth
            slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
            value={typed}
            onChange={event => {
                setTyped(event.target.value)
                const millimetres = parseTolerance(event.target.value)
                if (millimetres !== undefined) onChange(millimetres)
            }}
        />
    )
}

interface ToleranceFieldsProps {
    value: CollationTolerance
    onChange: (tolerance: CollationTolerance) => void
}

/** How far apart two symbols may lie and still be taken for one. */
export const ToleranceFields = ({ value, onChange }: ToleranceFieldsProps) => (
    <>
        <ToleranceField
            label='Collation Tolerance, Start (mm)'
            value={value.toleranceStart}
            onChange={toleranceStart => onChange({ ...value, toleranceStart })}
        />
        <ToleranceField
            label='Collation Tolerance, End (mm)'
            value={value.toleranceEnd}
            onChange={toleranceEnd => onChange({ ...value, toleranceEnd })}
        />
    </>
)
