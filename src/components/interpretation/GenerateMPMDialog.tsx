import { Thing, getUrl, getThing, getFile, getSolidDataset, getUrlAll, buildThing, asUrl } from "@inrupt/solid-client"
import { useSession } from "@inrupt/solid-ui-react"
import { RDF } from "@inrupt/vocab-common-rdf"
import { Dialog, DialogTitle, DialogContent, Box, Typography, DialogActions, Button, CircularProgress, Select, MenuItem, Stack, Alert, Snackbar } from "@mui/material"
import { useState } from "react"
import { crm, mer, oa, crmdig } from "../../helpers/namespaces"
import { urlAsLabel } from "../../helpers/urlAsLabel"
import { loadVerovio } from "../../lib/loadVerovio.mjs"
import { MEI } from "../../lib/mei"
import { asPianoRoll } from "../../lib/midi/asPianoRoll"
import { Save } from "@mui/icons-material"
import { TransformerSettings, TransformerSettingsBox } from "./TransformerSettingsBox"
import { MPM, getDefaultPipeline } from "mpmify"
import { asMSM } from "../../lib/mei/asMSM"

interface GenerateMPMDialogProps {
    alignment: Thing
    open: boolean
    onCreate: (creation: Thing, mpm: MPM) => void
    onClose: () => void
}

export const GenerateMPMDialog = ({ alignment, open, onCreate, onClose }: GenerateMPMDialogProps) => {
    const { session } = useSession()

    const [message, setMessage] = useState<string>()
    const [defaultPipeline, setDefaultPipeline] = useState<'melodic-texture' | 'chordal-texture'>('melodic-texture')
    const [transformerSettings, setTransformerSettings] = useState<TransformerSettings>({
        minimumArpeggioSize: 2,
        beatLength: 'denominator',
        epsilon: 3,
        rubatoLength: 'everything'
    })

    const performInterpolation = async () => {
        setMessage(`Performing interpolation`)

        const meiUrl = getUrl(alignment, mer('has_score'))
        const midiUrl = getUrl(alignment, mer('has_recording'))
        console.log(meiUrl, midiUrl)
        if (!meiUrl || !midiUrl) {
            setMessage(`Invalid alignment provided.`)
            return
        }

        setMessage(`Fetching MEI ${meiUrl}`)
        const mei = await getFile(
            meiUrl, { fetch: session.fetch as any })
        if (!mei) return

        setMessage(`Fetching MIDI ${midiUrl}`)
        const midiDataset = await getSolidDataset(midiUrl, { fetch: session.fetch as any })
        if (!midiDataset) {
            setMessage(`Failed loading Solid Dataset for MIDI ${midiUrl}`)
            return
        }

        const piece = getThing(midiDataset, midiUrl)
        if (!piece) return

        const mei_ = new MEI(await mei.text(), await loadVerovio(), new DOMParser())
        const pr_ = asPianoRoll(piece, midiDataset)
        if (!pr_) return

        setMessage(`Transforming`)

        // convert alignment to MSM which then can be fed into the pipeline
        const msm = asMSM(mei_)

        const alignmentDataset = await getSolidDataset(asUrl(alignment), { fetch: session.fetch as any })
        if (!alignmentDataset) {
            setMessage(`Failed loading Solid Dataset with alignment pairs for ${asUrl(alignment)}`)
            return
        }

        const pairUrls = getUrlAll(alignment, crm('P9_consists_of'))
        for (const pairUrl of pairUrls) {
            const pair = getThing(alignmentDataset, pairUrl)
            if (!pair) continue

            const scoreNoteId = urlAsLabel(getUrl(pair!, oa('hasTarget')))
            const midiNoteUrl = getUrl(pair!, oa('hasBody'))
            if (!scoreNoteId || !midiNoteUrl) continue

            const midiNote = pr_.events.find(event => event.id === midiNoteUrl)
            if (!midiNote) continue

            msm.addPerformanceInfo(scoreNoteId, midiNote)
        }

        console.log('msm=', msm.serialize(false))

        const newMPM = new MPM(2)

        // kick-off pipeline
        getDefaultPipeline(defaultPipeline, transformerSettings).head?.transform(msm, newMPM)

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

    const workInProgress = message !== undefined && message !== 'done'

    return (
        <>
            <Snackbar message={message} open={!!message} />
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>Generate MPM</DialogTitle>
                <DialogContent>
                    <Stack spacing={1}>
                        <Alert severity="info">Existing MPM encodings will be overridden.</Alert>
                        <Box>
                            <Typography>Which texture does the music have?</Typography>
                            <Select
                                sx={{ m: 1 }}
                                size="small"
                                value={defaultPipeline}
                                onChange={e => setDefaultPipeline(e.target.value as 'melodic-texture' | 'chordal-texture')}>
                                <MenuItem value='chordal-texture'>chordal</MenuItem>
                                <MenuItem value='melodic-texture'>melodic</MenuItem>
                            </Select>
                        </Box>
                        <TransformerSettingsBox onChange={(settings) => setTransformerSettings(settings)} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        startIcon={workInProgress
                            ? <CircularProgress />
                            : <Save />}
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

