import { Add, Delete } from "@mui/icons-material"
import { Button, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material"
import { DateAssignment, FeatureSource, SourceKind, sourceKinds, sourceLabels } from "linked-rolls"
import { DateStatementField } from "./DateStatementField"

const notStated = ''

/** A piece of software as typed: its name, and its version where one is known. */
export interface SoftwareInput {
    name: string
    version: string
}

/**
 * A source as typed, so that a half-filled statement survives while
 * the dialog is open. An empty kind states no source at all.
 */
export interface SourceInput {
    kind: SourceKind | typeof notStated
    output: string
    device: string
    software: SoftwareInput[]
    instrument: string
    date: DateAssignment | undefined
    note: string
}

export const noSource: SourceInput = {
    kind: notStated,
    output: '',
    device: '',
    software: [],
    instrument: '',
    date: undefined,
    note: ''
}

export const sourceInputOf = (source: FeatureSource | undefined): SourceInput =>
    source
        ? {
            kind: source.kind,
            output: source.output ?? '',
            device: source.device?.name ?? '',
            software: (source.software ?? []).map(({ name, version }) => ({ name, version: version ?? '' })),
            instrument: source.instrument?.name ?? '',
            date: source.date,
            note: source.note ?? ''
        }
        : noSource

/** The software as typed, less the entries that name nothing. */
const softwareOf = (input: readonly SoftwareInput[]) =>
    input
        .map(entry => ({ name: entry.name.trim(), version: entry.version.trim() }))
        .filter(entry => entry.name)
        .map(({ name, version }) => ({ name, ...(version ? { version } : {}) }))

/**
 * The source the input states, or nothing while it names no kind. What
 * the form does not edit is kept from the source it started from: who
 * carried the capture out, and how the instrument was regulated.
 */
export const featureSourceOf = (input: SourceInput, previous?: FeatureSource): FeatureSource | undefined => {
    if (!input.kind) return undefined

    const output = input.output.trim()
    const device = input.device.trim()
    const instrument = input.instrument.trim()
    const note = input.note.trim()
    const software = softwareOf(input.software)

    return {
        kind: input.kind,
        ...(previous?.actor ? { actor: previous.actor } : {}),
        ...(output ? { output } : {}),
        ...(device ? { device: { name: device, sameAs: [] } } : {}),
        ...(software.length > 0 ? { software } : {}),
        ...(instrument ? { instrument: { ...previous?.instrument, name: instrument, sameAs: previous?.instrument?.sameAs ?? [] } } : {}),
        ...(input.date ? { date: input.date } : {}),
        ...(note ? { note } : {})
    }
}

/** The items with the one at the index replaced. */
const replacing = <T,>(items: readonly T[], index: number, item: T): T[] =>
    items.map((existing, at) => at === index ? item : existing)

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
                onChange={e => onChange({ ...value, kind: e.target.value })}
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
                {value.software.map((entry, index) => (
                    <Stack direction='row' spacing={1} alignItems='center' key={index}>
                        <TextField
                            size='small'
                            label='Software'
                            value={entry.name}
                            placeholder='e.g. Transkun'
                            onChange={e => onChange({ ...value, software: replacing(value.software, index, { ...entry, name: e.target.value }) })}
                            fullWidth
                        />
                        <TextField
                            size='small'
                            label='Version'
                            value={entry.version}
                            placeholder='e.g. 2.0'
                            onChange={e => onChange({ ...value, software: replacing(value.software, index, { ...entry, version: e.target.value }) })}
                        />
                        <IconButton
                            size='small'
                            onClick={() => onChange({ ...value, software: value.software.filter((_, at) => at !== index) })}
                        >
                            <Delete fontSize='small' />
                        </IconButton>
                    </Stack>
                ))}
                <Button
                    size='small'
                    startIcon={<Add />}
                    onClick={() => onChange({ ...value, software: [...value.software, { name: '', version: '' }] })}
                    sx={{ alignSelf: 'flex-start' }}
                >
                    Software
                </Button>
                {value.kind === 'recording' && (
                    <TextField
                        size='small'
                        label='Instrument it was played on'
                        value={value.instrument}
                        placeholder='e.g. Steinway with a Welte-Mignon Vorsetzer'
                        onChange={e => onChange({ ...value, instrument: e.target.value })}
                        fullWidth
                    />
                )}
                <DateStatementField
                    label='Date of the capture'
                    value={value.date}
                    onChange={date => onChange({ ...value, date })}
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
