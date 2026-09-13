import { MusicNote } from "@mui/icons-material";
import { Alert, Button, CircularProgress, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, Divider, Stack } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { addCopy, Agent, assignObject, clearSource, createVersion, EditionOp, Millimeters, mm, nameCopy, ObjectAssumption, PaperSpeed, paperSpeedOfSpencerAnn, readFromPhillipsEroll, readFromSpencerBar, readFromStanfordAton, readSpencerAnn, RollCopy, RollTempo, Seconds, stateSource, systemOf, TrackerBar, welteLicensee, welteT100 } from "linked-rolls";
import { paperAt, WELTE_SPOOL } from "welte-mignon-emulator";
import { EditionContext } from "../../providers/EditionContext";
import { v4 } from "uuid";
import { noSpeed, PaperSpeedFields, paperSpeedOf, SpeedInput, speedInputOf, SystemSelect, tempoStartOf } from "./ProductionFields";
import { featureSourceOf, noSource, SourceFields, SourceInput, sourceInputOf } from "./SourceFields";
import { ReservationList } from "./Reservations";
import { CarriedVersions } from "./CarriedVersions";

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

export const isRollFile = (file: File) =>
    file.name.endsWith('.bar') || file.name.endsWith('.txt') || file.name.endsWith('.mid')
const isAnnFile = (file: File) => file.name.endsWith('.ann')

/**
 * Where the paper had run after so many seconds on a roll reader,
 * which is what a Phillips e-roll times its perforations by. The
 * take-up spool accelerates the paper as it fills, after Gottschewski;
 * a copy cut for another system winds on a spool whose constants
 * nobody has measured, so its places come out to scale and aligning it
 * against another copy says by how much.
 */
export const placeOnPaper = (elapsed: Seconds): Millimeters => mm(paperAt(WELTE_SPOOL, elapsed) * 10)

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

/** The operations applied as one, so that undoing takes them back together. */
const together = (...ops: EditionOp[]): EditionOp => draft => ops.forEach(op => op(draft))

export const RollCopyDialog = ({ open, copy, onClose, onDone }: RollCopyDialogProps) => {
    const { edition, apply } = useContext(EditionContext)
    // A copy is read by the bar it was cut for; naming none, it is read by the T-100.
    const editionBar = welteT100
    const tempo = edition?.tempoAdjustment
    const [files, setFiles] = useState<File[]>([]);
    const [keeper, setKeeper] = useState('')
    const [keeperAuthority, setKeeperAuthority] = useState('')
    const [copySiglum, setCopySiglum] = useState('')
    const [siglum, setSiglum] = useState('')
    const [system, setSystem] = useState<TrackerBar>(editionBar)
    const [speed, setSpeed] = useState<SpeedInput>(noSpeed)
    const [speedTyped, setSpeedTyped] = useState(false)
    const [suggestion, setSuggestion] = useState<Suggestion>()
    const [source, setSource] = useState<SourceInput>(noSource)
    const [sourceTyped, setSourceTyped] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()

    useEffect(() => {
        if (!copy) return
        setKeeper(copy.keeper?.name ?? '')
        setKeeperAuthority(copy.keeper?.sameAs[0] ?? '')
        setCopySiglum(copy.siglum ?? '')
        setSource(sourceInputOf(copy.readFrom))
    }, [copy])

    useEffect(() => {
        if (!open) {
            setFiles([])
            setKeeper(copy?.keeper?.name ?? '')
            setKeeperAuthority(copy?.keeper?.sameAs[0] ?? '')
            setCopySiglum(copy?.siglum ?? '')
            setSiglum('')
            setSystem(editionBar)
            setSpeed(noSpeed)
            setSpeedTyped(false)
            setSuggestion(undefined)
            setSource(sourceInputOf(copy?.readFrom))
            setSourceTyped(false)
            setError(undefined)
            setLoading(false)
        }
    }, [open, copy, editionBar])

    useEffect(() => {
        let stale = false
        suggestedSpeed(files, system, editionBar, tempo)
            .then(found => {
                if (stale) return
                setSuggestion(found)
                if (!speedTyped) setSpeed(found ? speedInputOf(found.speed) : noSpeed)
            })
            // A speed that cannot be read leaves the field as the user typed it.
            .catch((error: unknown) => console.warn('No speed could be suggested:', error))
        return () => { stale = true }
    }, [files, system, editionBar, tempo, speedTyped])

    const rollFile = files.find(isRollFile)

    /** The keeper as typed, or nothing where no name is given. */
    const keeperStated = (): Agent | undefined => {
        const name = keeper.trim()
        if (!name) return undefined
        return { name, sameAs: keeperAuthority.trim() ? [keeperAuthority.trim()] : [] }
    }

    /** The speed as typed, taken over with its reason where it came from a suggestion. */
    const speedStated = (): ObjectAssumption<PaperSpeed> | undefined => {
        const paperSpeed = paperSpeedOf(speed)
        if (!paperSpeed) return undefined
        return !speedTyped && suggestion ? adopted(suggestion) : assignObject(paperSpeed)
    }

    const handleUpload = async () => {
        if (!edition) return

        // A copy already in the edition is described again without
        // reading its file in again.
        if (copy) {
            const stated = featureSourceOf(source, copy.readFrom)
            const keeperOfCopy = keeperStated()
            apply(together(
                stated ? stateSource(copy.id, stated) : clearSource(copy.id),
                nameCopy(copy.id, copySiglum),
                draft => {
                    const edited = draft.copies.find(candidate => candidate.id === copy.id)
                    if (!edited) return
                    if (keeperOfCopy) edited.keeper = keeperOfCopy
                    else delete edited.keeper
                }
            ))
            onDone?.(copy.id)
            onClose()
            return
        }

        // A copy nobody can reach, known only from a recording, has no
        // file to read and no version of its own; what it carries is stated.
        if (!rollFile) {
            const stated = featureSourceOf(source)
            if (!stated) {
                setError('Please select a roll file, or state the source of a copy known without one.')
                return
            }
            const speedOfCopy = speedStated()
            const keeperOfCopy = keeperStated()
            const known: RollCopy = {
                type: 'RollCopy',
                id: v4(),
                ops: [],
                measurements: {},
                conditions: [],
                modifications: [],
                features: [],
                production: { system: systemOf(system), ...(speedOfCopy && { speed: speedOfCopy }) },
                readFrom: stated,
                ...(keeperOfCopy && { keeper: keeperOfCopy })
            }
            apply(together(addCopy(known), nameCopy(known.id, copySiglum)))
            onDone?.(known.id)
            onClose()
            return
        }

        setError(undefined)
        setLoading(true)

        try {
            let rollCopy: RollCopy

            if (rollFile.name.endsWith('.bar')) {
                rollCopy = readFromSpencerBar(await rollFile.arrayBuffer(), { system });
            }
            else if (rollFile.name.endsWith('.txt')) {
                rollCopy = readFromStanfordAton(await rollFile.text(), { system });
            }
            else if (rollFile.name.endsWith('.mid')) {
                rollCopy = readFromPhillipsEroll(await rollFile.arrayBuffer(), {
                    system,
                    placeAt: placeOnPaper
                });
            }
            else {
                throw new Error('Expected a Stanford analysis (.txt), a Spencer e-roll (.bar) or a Phillips e-roll (.mid).')
            }

            const speedOfCopy = speedStated()
            if (speedOfCopy) rollCopy.production = { ...rollCopy.production, speed: speedOfCopy }

            const keeperOfCopy = keeperStated()
            if (keeperOfCopy) rollCopy.keeper = keeperOfCopy

            // A reader that knows how it read the roll says so itself;
            // the dialog only overrides that where the editor stated one,
            // and keeps who read it.
            rollCopy.readFrom = featureSourceOf(source, rollCopy.readFrom) ?? rollCopy.readFrom

            apply(together(createVersion(siglum, rollCopy), nameCopy(rollCopy.id, copySiglum)))
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
            <DialogTitle>{copy ? 'Edit Roll Copy' : 'Add Roll Copy'}</DialogTitle>
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

                    <Typography>Siglum</Typography>
                    <TextField
                        size='small'
                        value={copySiglum}
                        onChange={e => setCopySiglum(e.target.value)}
                        placeholder='e. g. W1'
                        label='Siglum of the copy'
                    />
                    {!copy && (
                        <TextField
                            size='small'
                            value={siglum}
                            onChange={e => setSiglum(e.target.value)}
                            placeholder='e. g. B1'
                            label='(Preliminary) siglum of its version'
                        />
                    )}

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
                    <Typography>Source of the Features</Typography>
                    <SourceFields
                        value={source}
                        onChange={input => {
                            setSource(input)
                            setSourceTyped(true)
                        }}
                    />
                    {copy && <ReservationList copy={{ ...copy, readFrom: featureSourceOf(source, copy.readFrom) }} />}
                    {copy && (
                        <>
                            <Divider flexItem />
                            <CarriedVersions copyId={copy.id} />
                        </>
                    )}

                    {!copy && (
                        <>
                            <Divider flexItem />
                            <Button variant="outlined" component="label" startIcon={<MusicNote />}>
                                {files.length > 0
                                    ? files.map(file => file.name).join(', ')
                                    : 'Upload Roll Analysis (.txt), Spencer E-Roll (.bar with its .ann) or Phillips E-Roll (.mid)'}
                                <input
                                    type="file"
                                    hidden
                                    multiple
                                    accept=".txt,.bar,.ann,.mid"
                                    onChange={(e) => {
                                        const chosen = Array.from(e.target.files ?? [])
                                        setFiles(chosen)
                                        // Spencer's Welte e-rolls are Licensee rolls
                                        if (chosen.some(file => file.name.endsWith('.bar'))) setSystem(welteLicensee)
                                        const roll = chosen.find(isRollFile)
                                        // A hole list somebody measured on a scan. A
                                        // Phillips e-roll says for itself that it was
                                        // played on his reader, and says who read it,
                                        // so leaving the field empty keeps the more
                                        // it knows.
                                        if (roll && !roll.name.endsWith('.mid') && !sourceTyped) {
                                            setSource(current => ({ ...current, kind: 'analysis' }))
                                        }
                                    }}
                                />
                            </Button>
                            <Typography variant='caption' color='text.secondary'>
                                A copy known only from a recording needs no file: state its source above
                                and save, then say which versions it carries.
                            </Typography>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button
                    variant='contained'
                    disabled={loading}
                    onClick={() => void handleUpload()}
                    startIcon={loading ? <CircularProgress size={16} /> : undefined}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog >
    );
};
