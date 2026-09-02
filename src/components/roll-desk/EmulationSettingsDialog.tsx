import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material"
import { defaultEmulationOptions, EmulationOptions } from "linked-rolls"
import { useState } from "react"

interface EmulationSettingsDialogProps {
    open: boolean
    onClose: () => void
    onDone: (options: EmulationOptions) => void
}

const pedalModes = ['continuous', 'switch'] as const

export const EmulationSettingsDialog = ({ open, onClose, onDone }: EmulationSettingsDialogProps) => {
    const [options, setOptions] = useState<EmulationOptions>(defaultEmulationOptions)
    const { spool, velocity } = options

    const numberField = (label: string, value: number, onChange: (value: number) => void, step = 1) => (
        <TextField
            label={label}
            type='number'
            size='small'
            value={value}
            inputProps={{ step }}
            onChange={e => {
                const changed = Number(e.target.value)
                if (Number.isFinite(changed)) onChange(changed)
            }}
        />
    )

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Emulation Settings
            </DialogTitle>
            <DialogContent>
                <Stack direction='column' spacing={2} sx={{ mt: 1 }}>
                    <Typography>Take-up spool, after Gottschewski</Typography>
                    {numberField('Seconds per revolution', spool.revolutionSeconds,
                        revolutionSeconds => setOptions({ ...options, spool: { ...spool, revolutionSeconds } }), 0.01)}
                    {numberField('Circumference effect (0 = constant speed, 1 = full)', spool.circumferenceEffect,
                        circumferenceEffect => setOptions({ ...options, spool: { ...spool, circumferenceEffect } }), 0.1)}
                    <Divider />
                    <Typography>
                        Velocity at the open rail, at the Mezzoforte pin and at the closed rail
                    </Typography>
                    {numberField('Piano', velocity.piano, piano => setOptions({ ...options, velocity: { ...velocity, piano } }))}
                    {numberField('Mezzoforte', velocity.mezzoforte, mezzoforte => setOptions({ ...options, velocity: { ...velocity, mezzoforte } }))}
                    {numberField('Forte', velocity.forte, forte => setOptions({ ...options, velocity: { ...velocity, forte } }))}
                    <Divider />
                    <FormControl>
                        <FormLabel>Pedals</FormLabel>
                        <Select
                            value={options.pedalMode}
                            size='small'
                            onChange={e => setOptions({ ...options, pedalMode: e.target.value as EmulationOptions['pedalMode'] })}
                        >
                            {pedalModes.map(mode => (
                                <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        onDone(options)
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
