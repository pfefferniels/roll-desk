import { Thing, getUrl, getThing, getFile, getSolidDataset, getUrlAll, buildThing, asUrl } from "@inrupt/solid-client"
import { useSession, DatasetContext } from "@inrupt/solid-ui-react"
import { RDFS, RDF } from "@inrupt/vocab-common-rdf"
import { Dialog, DialogTitle, DialogContent, Box, Typography, DialogActions, Button, CircularProgress, Select, MenuItem, Stack } from "@mui/material"
import { useContext, useState } from "react"
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
    const { solidDataset: dataset } = useContext(DatasetContext)

    const [interpolationState, setInterpolationState] = useState<'fetching-mei' | 'fetching-midi' | 'transforming' | 'interpolating' | 'done'>()
    const [defaultPipeline, setDefaultPipeline] = useState<'melodic-texture' | 'chordal-texture'>('melodic-texture')
    const [transformerSettings, setTransformerSettings] = useState<TransformerSettings>({
        minimumArpeggioSize: 2,
        beatLength: 'denominator',
        epsilon: 3,
        rubatoLength: 'everything'
    })

    const performInterpolation = async () => {
        if (!dataset) return

        const meiUrl = getUrl(alignment, mer('has_score'))
        const midiUrl = getUrl(alignment, mer('has_recording'))
        if (!meiUrl || !midiUrl) return

        const meiExpression = getThing(dataset, meiUrl)
        const midiExpression = getThing(dataset, midiUrl)
        if (!meiExpression || !midiExpression) return

        setInterpolationState('fetching-mei')
        const mei = await getFile(
            getUrl(meiExpression, RDFS.label) || '', { fetch: session.fetch as any })
        if (!mei) return

        setInterpolationState('fetching-midi')
        const pieceUrl = getUrl(midiExpression, RDFS.label)
        const midiDataset = await getSolidDataset(
            getUrl(midiExpression, RDFS.label) || '', { fetch: session.fetch as any }
        )
        if (!pieceUrl || !midiDataset) return

        const piece = getThing(midiDataset, pieceUrl)
        if (!piece) return

        const mei_ = new MEI(await mei.text(), await loadVerovio(), new DOMParser())
        const pr_ = asPianoRoll(piece, midiDataset)
        if (!pr_) return

        setInterpolationState('transforming')

        // convert alignment to MSM which then can be fed into the pipeline
        const msm = asMSM(mei_)

        const pairUrls = getUrlAll(alignment, crm('P9_consists_of'))
        for (const pairUrl of pairUrls) {
            const pair = getThing(dataset, pairUrl)
            if (!pair) continue

            const scoreNoteId = urlAsLabel(getUrl(pair!, oa('hasTarget')))
            const midiNoteUrl = getUrl(pair!, oa('hasBody'))
            if (!scoreNoteId || !midiNoteUrl) continue

            const midiNote = pr_.events.find(event => event.id === midiNoteUrl)
            if (!midiNote) continue

            msm.addPerformanceInfo(scoreNoteId, midiNote)
        }


        console.log(msm.serialize(false))

        const newMPM = new MPM(2)

        setInterpolationState('interpolating')
        // kick-off pipeline
        getDefaultPipeline(defaultPipeline, transformerSettings).head?.transform(msm, newMPM)

        setInterpolationState('done')
        return newMPM
    }

    const save = async () => {
        const creationEvent = buildThing()
            .addUrl(RDF.type, crmdig('D10_Software_Execution'))
            .addStringNoLocale(crmdig('L23_used_software_or_firmware'), 'mpm-interpolator')
            .addUrl(crmdig('L30_has_operator'), session.info.webId!)

        creationEvent.addUrl(crmdig('L10_had_input'), asUrl(alignment))

        const mpm = await performInterpolation()
        if (!mpm) return

        onCreate(creationEvent.build(), mpm)
    }

    const workInProgress = interpolationState !== undefined && interpolationState !== 'done'
    const ready = !workInProgress

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Perform MPM Interpolation</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
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
                    disabled={!ready}
                    startIcon={workInProgress
                        ? <CircularProgress />
                        : <Save />}
                    onClick={async () => {
                        await save()
                        onClose()
                    }}
                >
                    {workInProgress ? interpolationState : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

