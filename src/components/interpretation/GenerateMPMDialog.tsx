import { Thing, getUrl, getThing, getFile, getSolidDataset, getUrlAll, buildThing, asUrl } from "@inrupt/solid-client"
import { useSession } from "@inrupt/solid-ui-react"
import { RDF } from "@inrupt/vocab-common-rdf"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Alert } from "@mui/material"
import { useState } from "react"
import { crm, mer, crmdig } from "../../helpers/namespaces"
import { urlAsLabel } from "../../helpers/urlAsLabel"
import { loadVerovio } from "../../lib/loadVerovio.mjs"
import { MEI } from "../../lib/mei"
import { Save } from "@mui/icons-material"
import { MPM, Pipeline } from "mpmify"
import { asMSM } from "../../lib/mei/asMSM"
import { useSnackbar } from "../../providers/SnackbarContext"
import { Emulation } from "linked-rolls"
import { NoteOnEvent, NoteOffEvent } from "linked-rolls/lib/.ldo/rollo.typings"
import { InsertDynamicsInstructions, InsertTempoInstructions } from "mpmify/lib/transformers"
import { PipelineEditor } from "./PipelineEditor"

interface GenerateMPMDialogProps {
    alignment: Thing
    open: boolean
    onCreate: (creation: Thing, mpm: MPM) => void
    onClose: () => void
}

const defaultPipeline = () => {
    const pipeline = new Pipeline()
    pipeline.push(new InsertTempoInstructions())
    // pipeline.push(new InsertDynamicsInstructions())
    return pipeline
}

export const GenerateMPMDialog = ({ alignment, open, onCreate, onClose }: GenerateMPMDialogProps) => {
    const { session } = useSession()
    const { setMessage } = useSnackbar()

    const [pipeline, setPipeline] = useState<Pipeline>(defaultPipeline())

    const performInterpolation = async () => {
        setMessage(`Performing interpolation`)

        const meiUrl = getUrl(alignment, mer('has_score'))
        const cutoutUrl = getUrl(alignment, mer('has_cutout'))
        console.log(meiUrl, cutoutUrl)
        if (!meiUrl || !cutoutUrl) {
            setMessage(`Invalid alignment provided: ${asUrl(alignment)}`)
            return
        }

        setMessage(`Fetching MEI ${meiUrl}`)
        const mei = await getFile(
            meiUrl, { fetch: session.fetch as any })
        if (!mei) return

        const cutoutDataset = await getSolidDataset(cutoutUrl, { fetch: session.fetch as any })
        const cutout = getThing(cutoutDataset, cutoutUrl)
        if (!cutout) {
            setMessage('Associated cutout could not be found')
            return
        }

        const eventUrls = getUrlAll(cutout, crm('P106_is_composed_of'))
        if (!eventUrls.length) {
            console.log('Associated cutout contains no roll events')
            return
        }

        const eventDataset = await getFile(eventUrls[0], { fetch: session.fetch as any })
        const turtle = await eventDataset.text()

        const emulation = new Emulation()
        await emulation.importFromTurtle(turtle)

        const mei_ = new MEI(await mei.text(), await loadVerovio(), new DOMParser())

        // convert alignment to MSM which then can be fed into the pipeline
        const msm = asMSM(mei_)

        const alignmentDataset = await getSolidDataset(asUrl(alignment), { fetch: session.fetch as any })
        if (!alignmentDataset) {
            setMessage(`Failed loading Solid Dataset with alignment pairs for ${asUrl(alignment)}`)
            return
        }

        setMessage(`Loading Pairs`)
        const pairUrls = getUrlAll(alignment, crm('P9_consists_of'))
        setMessage(`${pairUrls.length} pairs loaded successfully`)
        for (const pairUrl of pairUrls) {
            const pair = getThing(alignmentDataset, pairUrl)
            if (!pair) continue

            const scoreNoteId = urlAsLabel(getUrl(pair!, mer('has_score_note')))
            const collatedEventUrl = getUrl(pair!, mer('has_event'))
            if (!scoreNoteId || !collatedEventUrl) continue

            const midiNotes = emulation.findEventsPerforming(collatedEventUrl)
            const noteOn = midiNotes.find(midiNote => midiNote.type?.["@id"] === 'NoteOnEvent') as NoteOnEvent | null
            const noteOff = midiNotes.find(midiNote => midiNote.type?.["@id"] === 'NoteOffEvent') as NoteOffEvent | null
            if (!noteOn || !noteOff) {
                console.log('Unexpected alignment to a non-note event. Ignoring.')
                continue
            }

            msm.addCustomInfo(scoreNoteId, {
                'midi.pitch': noteOn.pitch,
                'midi.onset': noteOn.at,
                'midi.duration': noteOff.at - noteOn.at,
                'midi.velocity': noteOn.velocity
            })
        }

        // make sure that only defined notes are being passed on to MPM generation
        msm.allNotes = msm.allNotes.filter(note => !isNaN(note['midi.onset']) && note['midi.onset'] !== undefined)

        const newMPM = new MPM(2)

        // kick-off pipeline
        pipeline.head?.transform(msm, newMPM)

        setMessage('Done.')
        return newMPM
    }

    const save = async () => {
        setMessage(`Saving`)
        const creationEvent = buildThing()
            .addUrl(RDF.type, crmdig('D10_Software_Execution'))
            .addStringNoLocale(crmdig('L23_used_software_or_firmware'), 'mpm-interpolator')
            .addUrl(crmdig('L30_has_operator'), session.info.webId!)

        creationEvent.addUrl(crmdig('L10_had_input'), asUrl(alignment))

        const mpm = await performInterpolation()
        if (!mpm) return

        onCreate(creationEvent.build(), mpm)
    }

    return (
        <>
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>Generate MPM</DialogTitle>
                <DialogContent>
                    <Stack spacing={1}>
                        <Alert severity="info">Existing MPM encodings will be overridden.</Alert>
                        <PipelineEditor
                            pipeline={pipeline}
                            onChange={newPipeline => setPipeline(newPipeline)} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        startIcon={<Save />}
                        onClick={async () => {
                            await save()
                            onClose()
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

