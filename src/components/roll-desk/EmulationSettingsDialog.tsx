import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormHelperText, FormLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material"
import { defaultWelteT100Options, InstrumentName, instrumentNameOf, instrumentNames, instruments, nuanceOf, PedalPreset, pedalPresetOf, pedalPresets, WelteT100Options } from "linked-rolls/welte-t100"
import { useState } from "react"
import { Concept, trackerBarOf, welteT100 } from "linked-rolls"
import { EmulationOptions } from "../../helpers/reproducingSystems"

interface EmulationSettingsDialogProps {
    open: boolean
    /** The system the open version is coded for, whose settings these are. */
    system?: Concept
    onClose: () => void
    onDone: (options: EmulationOptions) => void
}

const pedalModes = ['continuous', 'switch'] as const

const instrumentLabel = (name: InstrumentName) => {
    const { performer, title } = instruments[name].provenance
    return performer && title
        ? `${name}: ${performer}, ${title}`
        : `${name}: fitted across the six lined rolls`
}

const pedalPresetNames = Object.keys(pedalPresets) as PedalPreset[]

const pedalPresetNotes: Record<PedalPreset, string> = {
    damping: 'The dampers reach the strings within the shortest lift the rolls punch, so every lift damps.',
    brushing: 'Their fall is slowed until quick runs of lifts brush the strings without damping.'
}

export const EmulationSettingsDialog = ({ open, system, onClose, onDone }: EmulationSettingsDialogProps) => {
    const [options, setOptions] = useState<WelteT100Options>(defaultWelteT100Options)
    const bar = trackerBarOf(system)

    // The settings differ in shape from one system to the next, and only
    // the T-100's are written here so far.
    if (bar && bar.id !== welteT100.id) {
        return (
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>Emulation Settings</DialogTitle>
                <DialogContent>
                    <Typography>
                        The desk has no settings for the {bar.name} yet.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        )
    }
    const { spool, velocity } = options
    const instrument = instrumentNameOf(options.nuance)
    const pedalPreset = pedalPresetOf(options.pedals)

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
                Emulation Settings, {welteT100.name}
            </DialogTitle>
            <DialogContent>
                <Stack direction='column' spacing={2} sx={{ mt: 1 }}>
                    <Typography>Take-up spool, after Gottschewski</Typography>
                    {numberField('Seconds per revolution', spool.revolutionSeconds,
                        revolutionSeconds => setOptions({ ...options, spool: { ...spool, revolutionSeconds } }), 0.01)}
                    {numberField('Circumference effect (0 = constant speed, 1 = full)', spool.circumferenceEffect,
                        circumferenceEffect => setOptions({ ...options, spool: { ...spool, circumferenceEffect } }), 0.1)}
                    <Divider />
                    <FormControl>
                        <FormLabel>Instrument the nuancing constants were fitted as</FormLabel>
                        <Select
                            value={instrument ?? ''}
                            size='small'
                            onChange={e => setOptions({ ...options, nuance: nuanceOf(instruments[e.target.value as InstrumentName]) })}
                        >
                            {instrumentNames.map(name => (
                                <MenuItem key={name} value={name}>{instrumentLabel(name)}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Divider />
                    <Typography>
                        Velocity at the open rail, at the Mezzoforte pin and at the closed rail
                    </Typography>
                    {numberField('Piano', velocity.piano, piano => setOptions({ ...options, velocity: { ...velocity, piano } }))}
                    {numberField('Mezzoforte', velocity.mezzoforte, mezzoforte => setOptions({ ...options, velocity: { ...velocity, mezzoforte } }))}
                    {numberField('Forte', velocity.forte, forte => setOptions({ ...options, velocity: { ...velocity, forte } }))}
                    <Divider />
                    <Typography>Pedals</Typography>
                    <FormControl>
                        <FormLabel>Reading of the mechanism</FormLabel>
                        <Select
                            value={pedalPreset ?? ''}
                            size='small'
                            onChange={e => setOptions({ ...options, pedals: pedalPresets[e.target.value as PedalPreset] })}
                        >
                            {pedalPresetNames.map(name => (
                                <MenuItem key={name} value={name}>{name}</MenuItem>
                            ))}
                        </Select>
                        {pedalPreset && <FormHelperText>{pedalPresetNotes[pedalPreset]}</FormHelperText>}
                    </FormControl>
                    <FormControl>
                        <FormLabel>Output</FormLabel>
                        <Select
                            value={options.pedalMode}
                            size='small'
                            onChange={e => setOptions({ ...options, pedalMode: e.target.value as WelteT100Options['pedalMode'] })}
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
                        onDone({ [welteT100.id]: options })
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
