import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { feetPerMinute, metersPerMinute, PaperSpeed, RollTempo, TrackerBar, trackerBars } from "linked-rolls"

/** The speed the edition lets the roll start at, as a paper speed. */
export const tempoStartOf = (tempo: RollTempo): PaperSpeed =>
    tempo.unit === 'm/min'
        ? { value: tempo.startsWith, unit: 'm/min' }
        : { value: tempo.startsWith, unit: 'ft/min' }

interface SystemSelectProps {
    value: TrackerBar
    onChange: (bar: TrackerBar) => void
}

/** The reproducing system a copy was cut for, from the bars the library knows. */
export const SystemSelect = ({ value, onChange }: SystemSelectProps) => (
    <FormControl size='small' fullWidth>
        <InputLabel id='production-system-label'>Production system</InputLabel>
        <Select
            labelId='production-system-label'
            label='Production system'
            value={value.id}
            onChange={e => {
                const bar = trackerBars.find(bar => bar.id === e.target.value)
                if (bar) onChange(bar)
            }}
        >
            {trackerBars.map(bar => <MenuItem key={bar.id} value={bar.id}>{bar.name}</MenuItem>)}
        </Select>
    </FormControl>
)

const speedUnits = ['ft/min', 'm/min'] as const
type SpeedUnit = typeof speedUnits[number]

/** A paper speed as typed: the number as text, so that a half-typed value survives, and its unit. */
export interface SpeedInput {
    value: string
    unit: SpeedUnit
}

export const noSpeed: SpeedInput = { value: '', unit: 'ft/min' }

export const speedInputOf = (speed: PaperSpeed | undefined): SpeedInput =>
    speed ? { value: String(speed.value), unit: speed.unit } : noSpeed

/** The speed the input states, or nothing while it states none. */
export const paperSpeedOf = ({ value, unit }: SpeedInput): PaperSpeed | undefined => {
    const number = parseFloat(value)
    if (isNaN(number) || number <= 0) return undefined
    return unit === 'm/min'
        ? { value: metersPerMinute(number), unit }
        : { value: feetPerMinute(number), unit }
}

interface PaperSpeedFieldsProps {
    value: SpeedInput
    onChange: (speed: SpeedInput) => void
}

/** The paper speed a copy was cut for, as its label or its format states it. */
export const PaperSpeedFields = ({ value, onChange }: PaperSpeedFieldsProps) => (
    <Stack direction='row' spacing={1}>
        <TextField
            size='small'
            label='Paper speed'
            value={value.value}
            placeholder='e.g. 8 for tempo 80'
            onChange={e => onChange({ ...value, value: e.target.value })}
            fullWidth
        />
        <Select
            size='small'
            value={value.unit}
            onChange={e => onChange({ ...value, unit: e.target.value })}
        >
            {speedUnits.map(unit => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}
        </Select>
    </Stack>
)
