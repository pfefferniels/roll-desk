import { MenuItem, Stack, TextField } from '@mui/material'
import { assignDate, DateAssignment, dateOf, earliestOf, latestOf, notAfter, notBefore } from 'linked-rolls'
import { DateField } from './DateField'
import { useDraft } from '../../hooks/useDraft'

export const dateModes = ['within', 'after', 'before', 'between'] as const

export type DateMode = typeof dateModes[number]

export const modeLabels: Record<DateMode, string> = {
    within: 'on',
    after: 'not before',
    before: 'not after',
    between: 'between'
}

/** The days a statement is made of: the day itself or the first bound, and the second bound. */
export const daysOf = (date: DateAssignment | undefined): [Date | undefined, Date | undefined] => {
    if (!date) return [undefined, undefined]

    const within = dateOf(date)
    if (within) return [within, undefined]

    const earliest = earliestOf(date)
    const latest = latestOf(date)
    return earliest ? [earliest, latest] : [latest, undefined]
}

/** The mode a stated date is in. One that states nothing is a day waiting to be picked. */
export const modeOf = (date: DateAssignment | undefined): DateMode => {
    if (!date || dateOf(date)) return 'within'

    const earliest = earliestOf(date)
    const latest = latestOf(date)
    if (earliest && latest) return 'between'
    return earliest ? 'after' : 'before'
}

/**
 * The date the mode and the days state, or nothing while the day it
 * needs is not picked. A "between" missing its second day states the
 * lower bound alone, which is true as far as it goes. The belief held
 * about an earlier statement stays with the new one.
 */
export const statementIn = (
    mode: DateMode,
    first: Date | undefined,
    second: Date | undefined,
    previous?: DateAssignment
): DateAssignment | undefined => {
    if (!first) return undefined

    const kept = previous?.['@annotation'] ? { '@annotation': previous['@annotation'] } : {}
    const stated =
        mode === 'within' ? assignDate(first)
            : mode === 'after' ? notBefore(first)
                : mode === 'before' ? notAfter(first)
                    : second ? { after: first, before: second } : notBefore(first)

    return { ...stated, ...kept }
}

interface DateStatementFieldProps {
    label: string
    value: DateAssignment | undefined
    onChange: (date: DateAssignment | undefined) => void
    size?: 'small' | 'medium'
    fullWidth?: boolean
}

/**
 * A date as the edition states it: a day, or a bound where nobody can
 * give the day. The mode is held in the field rather than read back
 * from the value, so that "between" stands until its second day is
 * picked.
 */
export const DateStatementField = ({ label, value, onChange, size, fullWidth }: DateStatementFieldProps) => {
    const [mode, setMode] = useDraft(modeOf(value))
    const [first, second] = daysOf(value)

    const state = (inMode: DateMode, from: Date | undefined, to: Date | undefined) =>
        onChange(statementIn(inMode, from, to, value))

    return (
        <Stack direction='row' spacing={1} sx={{ width: fullWidth ? '100%' : undefined }}>
            <TextField
                select
                label={label}
                size={size}
                value={mode}
                onChange={event => {
                    const picked = event.target.value as DateMode
                    setMode(picked)
                    state(picked, first, second)
                }}
                sx={{ minWidth: 140 }}
            >
                {dateModes.map(candidate => (
                    <MenuItem key={candidate} value={candidate}>{modeLabels[candidate]}</MenuItem>
                ))}
            </TextField>
            <DateField
                label={mode === 'between' ? 'from' : 'day'}
                value={first}
                onChange={day => state(mode, day, second)}
                mayBeEmpty
                size={size}
                fullWidth={fullWidth}
            />
            {mode === 'between' && (
                <DateField
                    label='to'
                    value={second}
                    onChange={day => state(mode, first, day)}
                    mayBeEmpty
                    size={size}
                    fullWidth={fullWidth}
                />
            )}
        </Stack>
    )
}
