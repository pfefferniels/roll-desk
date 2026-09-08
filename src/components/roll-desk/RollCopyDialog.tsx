import { Delete, MusicNote } from "@mui/icons-material";
import { Alert, Button, CircularProgress, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, IconButton, Divider, Stack } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { assignObject, createVersion, ObjectAssumption, PaperSpeed, paperSpeedOfSpencerAnn, readFromSpencerBar, readFromStanfordAton, readSpencerAnn, removeCopy, RollCopy, RollTempo, TrackerBar, trackerBarOf, welteLicensee, welteT100 } from "linked-rolls";
import { EditionContext } from "../../providers/EditionContext";
import { v4 } from "uuid";
import { noSpeed, PaperSpeedFields, paperSpeedOf, SpeedInput, speedInputOf, SystemSelect, tempoStartOf } from "./ProductionFields";

interface RollCopyDialogProps {
    open: boolean
    copy?: RollCopy
    onClose: () => void
    onDone?: (copyId: string) => void
}

/** A speed the upload suggests, and where it comes from. */
interface Suggestion {
    speed: PaperSpeed
    source: string
}

const isRollFile = (file: File) => file.name.endsWith('.bar') || file.name.endsWith('.txt')
const isAnnFile = (file: File) => file.name.endsWith('.ann')

/**
 * The speed the upload suggests: the tempo in the .ann beside a
 * Spencer file, or, for a copy of the roll's own system, the tempo the
 * edition states or the speed documented for the system. A copy cut
 * for another system carries a tempo of its own, which nothing but its
 * label can tell.
 */
const suggestedSpeed = async (
    files: File[],
    system: TrackerBar,
    editionBar: TrackerBar,
    tempo?: RollTempo
): Promise<Suggestion | undefined> => {
    const ann = files.find(isAnnFile)
    if (ann) {
        const speed = paperSpeedOfSpencerAnn(readSpencerAnn(await ann.text()))
        if (speed) return { speed, source: `the roll tempo in ${ann.name}` }
    }
    if (system.id !== editionBar.id) return undefined
    if (tempo) return { speed: tempoStartOf(tempo), source: 'the tempo the edition states for the roll' }
    if (system.paperSpeed) return { speed: system.paperSpeed, source: `the speed documented for the ${system.name}` }
    return undefined
}

/** A speed taken over from a suggestion, with the suggestion's source as the reason for believing it. */
const adopted = (suggestion: Suggestion): ObjectAssumption<PaperSpeed> => ({
    ...suggestion.speed,
    '@annotation': {
        id: v4(),
        belief: {
            type: 'belief',
            id: v4(),
            certainty: 'likely',
            reasons: [{ type: 'beliefAdoption', note: suggestion.source }]
        }
    }
})

export const RollCopyDialog = ({ open, copy, onClose, onDone }: RollCopyDialogProps) => {
    const { edition, apply } = useContext(EditionContext)
    const editionBar = trackerBarOf(edition?.roll.system) ?? welteT100
    const tempo = edition?.tempoAdjustment
    const [files, setFiles] = useState<File[]>([]);
    const [keeper, setKeeper] = useState('')
    const [keeperAuthority, setKeeperAuthority] = useState('')
    const [siglum, setSiglum] = useState('')
    const [system, setSystem] = useState<TrackerBar>(editionBar)
    const [speed, setSpeed] = useState<SpeedInput>(noSpeed)
    const [speedTyped, setSpeedTyped] = useState(false)
    const [suggestion, setSuggestion] = useState<Suggestion>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()

    useEffect(() => {
        if (!copy) return
        setKeeper(copy.keeper.name)
        setKeeperAuthority(copy.keeper.sameAs[0] ?? '')
    }, [copy])

    useEffect(() => {
        if (!open) {
            setFiles([])
            setKeeper(copy?.keeper.name ?? '')
            setKeeperAuthority(copy?.keeper.sameAs[0] ?? '')
            setSiglum('')
            setSystem(editionBar)
            setSpeed(noSpeed)
            setSpeedTyped(false)
            setSuggestion(undefined)
            setError(undefined)
            setLoading(false)
        }
    }, [open, copy, editionBar])

    useEffect(() => {
        let stale = false
        suggestedSpeed(files, system, editionBar, tempo).then(found => {
            if (stale) return
            setSuggestion(found)
            if (!speedTyped) setSpeed(found ? speedInputOf(found.speed) : noSpeed)
        })
        return () => { stale = true }
    }, [files, system, editionBar, tempo, speedTyped])

    const rollFile = files.find(isRollFile)

    const handleUpload = async () => {
        if (!edition) return

        if (!rollFile) {
            setError('Please select a roll file to upload.')
            return
        }

        setError(undefined)
        setLoading(true)

        try {
            let rollCopy: RollCopy = copy || {
                ops: [],
                type: 'RollCopy',
                id: v4(),
                measurements: {},
                conditions: [],
                keeper: { name: '', sameAs: [] },
                modifications: [],
                features: [],
            }

            if (rollFile.name.endsWith('.bar')) {
                rollCopy = readFromSpencerBar(await rollFile.arrayBuffer(), { system, bar: editionBar });
            }
            else if (rollFile.name.endsWith('.txt')) {
                rollCopy = readFromStanfordAton(await rollFile.text(), { system, bar: editionBar });
            }
            else {
                throw new Error('Expected a Stanford analysis (.txt) or a Spencer e-roll (.bar).')
            }

            const paperSpeed = paperSpeedOf(speed)
            if (paperSpeed) {
                const stated = !speedTyped && suggestion ? adopted(suggestion) : assignObject(paperSpeed)
                rollCopy.production = { ...rollCopy.production, speed: stated }
            }

            rollCopy.keeper = {
                name: keeper.trim(),
                sameAs: keeperAuthority.trim() ? [keeperAuthority.trim()] : []
            }

            apply(createVersion(siglum, rollCopy))
            onDone?.(rollCopy.id)
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to parse the uploaded file.')
        } finally {
            setLoading(false)
        }
    };

    const speedHint = speedTyped
        ? undefined
        : suggestion
            ? `Prefilled from ${suggestion.source}.`
            : system.id !== editionBar.id
                ? 'A copy cut for another system carries a tempo of its own; state it if the label or the file gives one.'
                : undefined

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <Typography>Holding Institution</Typography>
                    <TextField
                        size='small'
                        value={keeper}
                        onChange={e => setKeeper(e.target.value)}
                        placeholder='e. g. Stanford University Libraries'
                        label='Holding institution'
                    />
                    <TextField
                        size='small'
                        value={keeperAuthority}
                        onChange={e => setKeeperAuthority(e.target.value)}
                        placeholder='e. g. https://d-nb.info/gnd/…'
                        label='Authority record (GND, Wikidata, ISIL)'
                    />

                    <Typography>(Preliminary) Siglum</Typography>
                    <TextField
                        size='small'
                        value={siglum}
                        onChange={e => setSiglum(e.target.value)}
                        placeholder='e. g. B1'
                        label='Siglum'
                    />

                    {!copy && (
                        <>
                            <Typography>Production</Typography>
                            <SystemSelect value={system} onChange={setSystem} />
                            <PaperSpeedFields
                                value={speed}
                                onChange={input => {
                                    setSpeed(input)
                                    setSpeedTyped(true)
                                }}
                            />
                            <Typography variant='caption' color='text.secondary'>
                                {speedHint ?? 'The system the copy was cut for decides how its holes are read. A copy cut for another speed than the roll comes out longer or shorter by the ratio of the speeds, which the alignment then shows.'}
                            </Typography>
                        </>
                    )}

                    <Divider flexItem />
                    <Button variant="outlined" component="label" startIcon={<MusicNote />}>
                        {files.length > 0 ? files.map(file => file.name).join(', ') : 'Upload Roll Analysis (.txt) or E-Roll (.bar with its .ann)'}
                        <input
                            type="file"
                            hidden
                            multiple
                            accept=".txt,.bar,.ann"
                            onChange={(e) => {
                                const chosen = Array.from(e.target.files ?? [])
                                setFiles(chosen)
                                // Spencer's Welte e-rolls are Licensee rolls
                                if (chosen.some(file => file.name.endsWith('.bar'))) setSystem(welteLicensee)
                            }}
                        />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button
                    variant='contained'
                    disabled={loading}
                    onClick={handleUpload}
                    startIcon={loading ? <CircularProgress size={16} /> : undefined}
                >
                    Save
                </Button>
                <IconButton color='secondary' onClick={() => {
                    if (!copy) return
                    apply(removeCopy(copy.id))
                }}>
                    <Delete />
                </IconButton>
            </DialogActions>
        </Dialog >
    );
};
