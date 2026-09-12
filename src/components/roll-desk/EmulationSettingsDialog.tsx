import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormHelperText, FormLabel, MenuItem, Select, Stack } from "@mui/material"
import { Concept, mm, trackerBarOf, welteLicensee, welteT100, welteT98 } from "linked-rolls"
import {
    defaultWelteT100Options, InstrumentName, instrumentNameOf, instrumentNames,
    instruments, nuanceOf, PedalPreset, pedalPresetOf, pedalPresets, WelteT100Options
} from "linked-rolls/welte-t100"
import {
    defaultWelteT98Options, instrumentNames as t98InstrumentNames, instrumentT98Of,
    labelOf, nuanceOf as t98NuanceOf, WelteT98InstrumentName, WelteT98Options
} from "linked-rolls/welte-t98"
import {
    defaultWelteLicenseeOptions, instruments as licenseeInstruments, WelteLicenseeOptions
} from "linked-rolls/welte-licensee"
import { useState } from "react"
import { CommonFields, NumberField, Provenance } from "./EmulationFields"
import { EmulationOptions } from "../../helpers/reproducingSystems"

interface EmulationSettingsDialogProps {
    open: boolean
    /** The system the open version is coded for, whose settings these are. */
    system?: Concept
    onClose: () => void
    onDone: (options: EmulationOptions) => void
}

const pedalPresetNotes: Record<PedalPreset, string> = {
    damping: 'The dampers reach the strings within the shortest lift the rolls punch, so every lift damps.',
    brushing: 'Their fall is slowed until quick runs of lifts brush the strings without damping.'
}

const PedalPresetField = ({ pedals, onChange }: {
    pedals: WelteT100Options['pedals']
    onChange: (pedals: WelteT100Options['pedals']) => void
}) => {
    const preset = pedalPresetOf(pedals)

    return (
        <FormControl>
            <FormLabel>Reading of the pedal mechanism</FormLabel>
            <Select
                value={preset ?? ''}
                size='small'
                onChange={event => onChange(pedalPresets[event.target.value])}
            >
                {(Object.keys(pedalPresets) as PedalPreset[]).map(name => (
                    <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
            </Select>
            {preset && <FormHelperText>{pedalPresetNotes[preset]}</FormHelperText>}
        </FormControl>
    )
}

const t100InstrumentLabel = (name: InstrumentName) => {
    const { performer, title } = instruments[name].provenance
    return performer && title ? `${name}: ${performer}, ${title}` : `${name}: fitted across the six lined rolls`
}

const T100Panel = ({ options, onChange }: {
    options: WelteT100Options
    onChange: (options: WelteT100Options) => void
}) => (
    <>
        <CommonFields options={options} onChange={onChange} />
        <Divider />
        <FormControl>
            <FormLabel>Instrument the nuancing constants were fitted as</FormLabel>
            <Select
                value={instrumentNameOf(options.nuance) ?? ''}
                size='small'
                onChange={event =>
                    onChange({ ...options, nuance: nuanceOf(instruments[event.target.value]) })}
            >
                {instrumentNames.map(name => (
                    <MenuItem key={name} value={name}>{t100InstrumentLabel(name)}</MenuItem>
                ))}
            </Select>
        </FormControl>
        <PedalPresetField pedals={options.pedals} onChange={pedals => onChange({ ...options, pedals })} />
    </>
)

/**
 * The green Welte's instruments come in three groups answering three
 * different questions, and they are never listed as one: `genuine` says
 * what a green Welte did, `derived` what Welte's editor meant the green
 * roll to sound like, and the difference between them is how far the
 * transfer succeeded. Both are empty until their fits are run, so a
 * playback today rests on the third group and says so.
 */
const nameOf = (name: WelteT98InstrumentName): string =>
    'genuine' in name ? `genuine:${name.genuine}`
        : 'derived' in name ? `derived:${name.derived}`
            : `unfitted:${name.unfitted}`

const groupOf = (name: WelteT98InstrumentName): 'genuine' | 'derived' | 'unfitted' =>
    'genuine' in name ? 'genuine' : 'derived' in name ? 'derived' : 'unfitted'

const groupNotes = {
    genuine: 'Fitted to the drawn nuance line of a green roll: what a green Welte did.',
    derived: 'Fitted so the green code reproduces the red reading of the same recording: what Welte’s editor meant it to sound like.',
    unfitted: 'Arithmetic from Welte’s regulation controls and the T-100 consensus, with no green roll behind it. Nothing should be published from a playback on these.'
} as const

const T98Panel = ({ options, onChange }: {
    options: WelteT98Options
    onChange: (options: WelteT98Options) => void
}) => {
    const chosen = groupOf(options.instrument)

    return (
        <>
            <CommonFields options={options} onChange={onChange} />
            <Divider />
            <FormControl>
                <FormLabel>Instrument the nuancing constants were fitted as</FormLabel>
                <Select
                    value={nameOf(options.instrument)}
                    size='small'
                    onChange={event => {
                        const picked = t98InstrumentNames.find(name => nameOf(name) === event.target.value)
                        const instrument = picked && instrumentT98Of(picked)
                        if (!picked || !instrument) return
                        onChange({ ...options, instrument: picked, nuance: t98NuanceOf(instrument) })
                    }}
                >
                    {(['genuine', 'derived', 'unfitted'] as const).flatMap(group => {
                        const inGroup = t98InstrumentNames.filter(name => groupOf(name) === group)
                        if (inGroup.length === 0) return []
                        return [
                            <MenuItem key={group} disabled value={`__${group}`}>{group}</MenuItem>,
                            ...inGroup.map(name => (
                                <MenuItem key={nameOf(name)} value={nameOf(name)} sx={{ pl: 4 }}>
                                    {labelOf(name)}
                                </MenuItem>
                            ))
                        ]
                    })}
                </Select>
            </FormControl>
            <Provenance>{groupNotes[chosen]}</Provenance>

            <PedalPresetField pedals={options.pedals} onChange={pedals => onChange({ ...options, pedals })} />

            <Divider />
            <NumberField
                label='Chain gap (mm)'
                value={options.chainGap}
                step={0.1}
                onChange={gap => onChange({ ...options, chainGap: mm(gap) })}
            />
            <FormHelperText>
                A held green command is punched as a chain of round holes with paper
                bridges, not as one slot. Chained punches closer than this are one
                perforation.
            </FormHelperText>

            <FormControl>
                <FormLabel>A long perforation on the bass sforzando-piano line</FormLabel>
                <Select
                    value={options.rewind}
                    size='small'
                    onChange={event =>
                        onChange({ ...options, rewind: event.target.value })}
                >
                    <MenuItem value='stop'>ends the performance there</MenuItem>
                    <MenuItem value='ignore'>sounds as a sforzando piano only</MenuItem>
                </Select>
                <FormHelperText>
                    It is the same valve and the same hole as the dynamic, so it always
                    acts as a sforzando piano. On the instrument it also cuts the suction
                    and no note sounds after it.
                </FormHelperText>
            </FormControl>
        </>
    )
}

const LicenseePanel = ({ options, onChange }: {
    options: WelteLicenseeOptions
    onChange: (options: WelteLicenseeOptions) => void
}) => (
    <>
        <CommonFields options={options} onChange={onChange} />
        <Divider />
        <FormControl>
            <FormLabel>Instrument the nuancing constants were fitted as</FormLabel>
            <Select value='welte-t100-consensus' size='small' disabled>
                <MenuItem value='welte-t100-consensus'>
                    unfitted: {Object.keys(licenseeInstruments.unfitted)[0]}
                </MenuItem>
            </Select>
        </FormControl>
        <Provenance>
            Nothing here was measured on a Licensee. These are the T-100 constants,
            fitted across six Freiburg instruments, and the spool is Welte&#8217;s own,
            carried over because Licensee rolls play at a range of paper speeds and
            no one figure belongs here. A Licensee playback is a Freiburg reading of
            American paper, and its time axis is a construction rather than a reading.
        </Provenance>
        <PedalPresetField pedals={options.pedals} onChange={pedals => onChange({ ...options, pedals })} />
    </>
)

export const EmulationSettingsDialog = ({ open, system, onClose, onDone }: EmulationSettingsDialogProps) => {
    const bar = trackerBarOf(system) ?? welteT100
    const [t100, setT100] = useState<WelteT100Options>(defaultWelteT100Options)
    const [t98, setT98] = useState<WelteT98Options>(defaultWelteT98Options)
    const [licensee, setLicensee] = useState<WelteLicenseeOptions>(defaultWelteLicenseeOptions)

    const panel = bar.id === welteT98.id ? <T98Panel options={t98} onChange={setT98} />
        : bar.id === welteLicensee.id ? <LicenseePanel options={licensee} onChange={setLicensee} />
            : <T100Panel options={t100} onChange={setT100} />

    const chosen = (): EmulationOptions =>
        bar.id === welteT98.id ? { [bar.id]: t98 }
            : bar.id === welteLicensee.id ? { [bar.id]: licensee }
                : { [bar.id]: t100 }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Emulation Settings, {bar.name}</DialogTitle>
            <DialogContent>
                <Stack direction='column' spacing={2} sx={{ mt: 1 }}>
                    {panel}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={() => {
                        onDone(chosen())
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
