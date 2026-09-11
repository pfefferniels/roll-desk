import { Divider, FormControl, FormHelperText, FormLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material"
import { VelocityMap } from "linked-rolls/welte-t100"

/** The settings every Welte scale has, whatever else its own dialog adds. */
export interface CommonOptions {
    spool: { revolutionSeconds: number, circumferenceEffect: number }
    velocity: VelocityMap
    pedalMode: 'continuous' | 'switch'
}

const pedalModes = ['continuous', 'switch'] as const

export const NumberField = ({ label, value, onChange, step = 1 }: {
    label: string
    value: number
    onChange: (value: number) => void
    step?: number
}) => (
    <TextField
        label={label}
        type='number'
        size='small'
        value={value}
        inputProps={{ step }}
        onChange={event => {
            const changed = Number(event.target.value)
            if (Number.isFinite(changed)) onChange(changed)
        }}
    />
)

/**
 * The fields that mean the same on every scale. The spool sets the time
 * axis and the velocity map is shared between the scales on purpose, so
 * that a red reading and a green one can be compared at all.
 */
export const CommonFields = <T extends CommonOptions,>({ options, onChange }: {
    options: T
    onChange: (options: T) => void
}) => {
    const { spool, velocity } = options

    return (
        <>
            <Typography>Take-up spool, which sets the time axis</Typography>
            <NumberField
                label='Seconds per revolution'
                value={spool.revolutionSeconds}
                step={0.01}
                onChange={revolutionSeconds =>
                    onChange({ ...options, spool: { ...spool, revolutionSeconds } })}
            />
            <NumberField
                label='Circumference effect (0 = constant speed, 1 = full)'
                value={spool.circumferenceEffect}
                step={0.1}
                onChange={circumferenceEffect =>
                    onChange({ ...options, spool: { ...spool, circumferenceEffect } })}
            />

            <Divider />

            <Typography>
                Velocity at the open rail, at the Mezzoforte pin and at the closed rail
            </Typography>
            <NumberField
                label='Piano'
                value={velocity.piano}
                onChange={piano => onChange({ ...options, velocity: { ...velocity, piano } })}
            />
            <NumberField
                label='Mezzoforte'
                value={velocity.mezzoforte}
                onChange={mezzoforte => onChange({ ...options, velocity: { ...velocity, mezzoforte } })}
            />
            <NumberField
                label='Forte'
                value={velocity.forte}
                onChange={forte => onChange({ ...options, velocity: { ...velocity, forte } })}
            />

            <Divider />

            <FormControl>
                <FormLabel>Pedals go out as</FormLabel>
                <Select
                    value={options.pedalMode}
                    size='small'
                    onChange={event =>
                        onChange({ ...options, pedalMode: event.target.value as CommonOptions['pedalMode'] })}
                >
                    {pedalModes.map(mode => (
                        <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                    ))}
                </Select>
                <FormHelperText>
                    A continuous controller carries the travel of the bellows; a switch
                    thresholds it to the two values a switching renderer understands.
                </FormHelperText>
            </FormControl>
        </>
    )
}

/**
 * What a set of nuancing constants rests on, said plainly.
 *
 * The three scales are not equally well founded, and a dialog that
 * listed their instruments alike would hide that: the T-100's are
 * fitted to drawn nuance lines, the T-98's fitted arms are empty so far,
 * and the Licensee's are the T-100's carried onto an instrument nobody
 * has measured.
 */
export const Provenance = ({ children }: { children: React.ReactNode }) => (
    <Stack sx={{ borderLeft: '3px solid #e5e7eb', pl: 1.5, py: 0.5 }}>
        <Typography variant='caption' color='text.secondary'>{children}</Typography>
    </Stack>
)
