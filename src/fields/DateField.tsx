import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import dayjs, { Dayjs } from 'dayjs'

/**
 * The date a field states once the picker reports `picked`. A date
 * still being typed is no statement yet, so what was stated before
 * stands. An emptied field states no date where the field may be
 * empty, and keeps what it had where the model asks for a date.
 */
export const dateAfterPicking = (
    picked: Dayjs | null,
    stated: Date | undefined,
    mayBeEmpty: boolean
): Date | undefined => {
    if (picked === null) return mayBeEmpty ? undefined : stated
    return picked.isValid() ? picked.toDate() : stated
}

interface DateFieldLayout {
    label: string
    size?: 'small' | 'medium'
    fullWidth?: boolean
}

interface RequiredDateProps extends DateFieldLayout {
    mayBeEmpty?: false
    value: Date
    onChange: (date: Date) => void
}

interface OptionalDateProps extends DateFieldLayout {
    mayBeEmpty: true
    value: Date | undefined
    onChange: (date: Date | undefined) => void
}

/**
 * A date the edition states. Whether it may be left empty follows the
 * model: a field the model requires carries no clear button, and a
 * field it marks optional writes the clearing through, so that an
 * editor who empties it sees the date go.
 */
export const DateField = (props: RequiredDateProps | OptionalDateProps) => {
    const { label, size, fullWidth, value, mayBeEmpty } = props

    const report = (picked: Dayjs | null) => {
        if (props.mayBeEmpty) props.onChange(dateAfterPicking(picked, props.value, true))
        else props.onChange(dateAfterPicking(picked, props.value, false) ?? props.value)
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
                label={label}
                value={value ? dayjs(value) : null}
                onChange={report}
                slotProps={{
                    field: { clearable: mayBeEmpty },
                    textField: { size, fullWidth }
                }}
            />
        </LocalizationProvider>
    )
}
