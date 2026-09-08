import { FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material"
import { assignValue, FeatureSource, SourceKind, sourceKinds, sourceLabels, valueOf } from "linked-rolls"
import { DateField } from "./DateField"

const notStated = ''

/**
 * A source as typed, so that a half-filled statement survives while
 * the dialog is open. An empty kind states no source at all.
 */
export interface SourceInput {
    kind: SourceKind | typeof notStated
    output: string
    device: string
    date: Date | undefined
    note: string
}

export const noSource: SourceInput = {
    kind: notStated,
    output: '',
    device: '',
    date: undefined,
    note: ''
}

export const sourceInputOf = (source: FeatureSource | undefined): SourceInput =>
    source
        ? {
            kind: source.kind,
            output: source.output ?? '',
            device: source.device?.name ?? '',
            date: source.date ? valueOf(source.date) : undefined,
            note: source.note ?? ''
        }
        : noSource

/** The source the input states, or nothing while it names no kind. */
export const featureSourceOf = (input: SourceInput): FeatureSource | undefined => {
    if (!input.kind) return undefined

    const output = input.output.trim()
    const device = input.device.trim()
    const note = input.note.trim()

    return {
        kind: input.kind,
        ...(output ? { output } : {}),
        ...(device ? { device: { name: device, sameAs: [] } } : {}),
        ...(input.date ? { date: assignValue(input.date) } : {}),
        ...(note ? { note } : {})
    }
}

interface SourceFieldsProps {
    value: SourceInput
    onChange: (source: SourceInput) => void
}

/**
 * What a copy's features were read from. What is not known is left
 * empty: the desk says what that costs rather than filling it in.
 */
export const SourceFields = ({ value, onChange }: SourceFieldsProps) => (
    <Stack spacing={1}>
        <FormControl size='small' fullWidth>
            <InputLabel id='source-kind-label'>Read from</InputLabel>
            <Select
                labelId='source-kind-label'
                label='Read from'
                value={value.kind}
                onChange={e => onChange({ ...value, kind: e.target.value as SourceInput['kind'] })}
            >
                <MenuItem value={notStated}><em>not stated</em></MenuItem>
                {sourceKinds.map(kind => (
                    <MenuItem key={kind} value={kind}>{sourceLabels[kind]}</MenuItem>
                ))}
            </Select>
        </FormControl>

        {value.kind && (
            <>
                <TextField
                    size='small'
                    label='File it produced'
                    value={value.output}
                    placeholder='e.g. https://…/wm225.mid'
                    onChange={e => onChange({ ...value, output: e.target.value })}
                    fullWidth
                />
                <TextField
                    size='small'
                    label='Scanner, camera or player'
                    value={value.device}
                    placeholder='e.g. Kodak i5850'
                    onChange={e => onChange({ ...value, device: e.target.value })}
                    fullWidth
                />
                <DateField
                    label='Date of the capture'
                    value={value.date}
                    onChange={date => onChange({ ...value, date })}
                    mayBeEmpty
                    size='small'
                    fullWidth
                />
                <TextField
                    size='small'
                    label='Note'
                    value={value.note}
                    placeholder='e.g. MIDI from a third party; the emulator is not named.'
                    onChange={e => onChange({ ...value, note: e.target.value })}
                    multiline
                    fullWidth
                />
                <Typography variant='caption' color='text.secondary'>
                    Leave a field empty where nothing is known. This states where the
                    numbers come from and says nothing about the state of the paper,
                    which is a condition of the copy.
                </Typography>
            </>
        )}
    </Stack>
)
