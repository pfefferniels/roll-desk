import { Thing, UrlString, getUrl, getThing, getFile, getSolidDataset, getUrlAll, buildThing } from "@inrupt/solid-client"
import { useSession, DatasetContext } from "@inrupt/solid-ui-react"
import { RDFS, RDF } from "@inrupt/vocab-common-rdf"
import { Dialog, DialogTitle, DialogContent, Box, Typography, DialogActions, Button } from "@mui/material"
import { useContext, useState } from "react"
import { crm, mer, oa, crmdig } from "../../helpers/namespaces"
import { urlAsLabel } from "../../helpers/urlAsLabel"
import { loadVerovio, loadDomParser } from "../../lib/globals"
import { MEI } from "../../lib/mei"
import { asPianoRoll } from "../../lib/midi/asPianoRoll"
import { MPM } from "../../lib/mpm"
import { MsmNote, MSM } from "../../lib/msm"
import { defaultPipelines } from "../../lib/transformers"
import { SelectEntity } from "../works/SelectEntity"


interface CreateInterpolationDialogProps {
    open: boolean
    onCreate: (creation: Thing, mpm: string) => void
    onClose: () => void
}

export const CreateInterpolationDialog = ({ open, onCreate, onClose }: CreateInterpolationDialogProps) => {
    const { session } = useSession()
    const { solidDataset: dataset, setDataset: setDataset } = useContext(DatasetContext)

    const [interpolationState, setInterpolationState] = useState<'fetching-mei' | 'fetching-midi' | 'transforming' | 'interpolating' | 'done'>()
    const [alignmentUrl, setAlignmentUrl] = useState<UrlString>()
    const [analysisUrl, setAnalysisUrl] = useState<UrlString>()
    const [pipeline, setPipeline] = useState(defaultPipelines['chordal-texture'])

    const performInterpolation = async () => {
        if (!dataset || !alignmentUrl) return

        if (!alignmentUrl) return

        const alignment = getThing(dataset, alignmentUrl)
        if (!alignment) return

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

        const mei_ = new MEI(await mei.text(), await loadVerovio(), await loadDomParser())
        const pr_ = asPianoRoll(piece, midiDataset)
        if (!pr_) return

        setInterpolationState('transforming')

        // convert alignment to MSM which then can be fed into the pipeline
        const msmNotes: MsmNote[] =
            getUrlAll(alignment, crm('P9_consists_of'))
                .map(pairUrl => getThing(dataset, pairUrl))
                .filter(pair => pair !== null)
                .reduce((acc, pair) => {
                    const scoreNoteId = urlAsLabel(getUrl(pair!, oa('hasTarget')))
                    const midiNoteUrl = getUrl(pair!, oa('hasBody'))

                    if (!scoreNoteId || !midiNoteUrl) return acc

                    const scoreNote = mei_.getById(scoreNoteId)
                    const midiNote = pr_.events.find(event => event.id === midiNoteUrl)

                    if (!scoreNote || !midiNote) return acc

                    acc.push({
                        'part': scoreNote.part,
                        'xml:id': scoreNote.id,
                        'date': MEI.qstampToTstamp(scoreNote.qstamp),
                        'duration': MEI.qstampToTstamp(scoreNote.duration),
                        'pitchname': scoreNote.pname!,
                        'octave': scoreNote.octave!,
                        'accidentals': scoreNote.accid!,
                        'midi.pitch': midiNote.pitch,
                        'midi.onset': midiNote.ontime,
                        'midi.duration': midiNote.offtime - midiNote.ontime,
                        'midi.velocity': midiNote.onvel
                    })
                    return acc
                }, [] as MsmNote[])

        setInterpolationState('interpolating')
        const msm = new MSM(msmNotes, mei_.timeSignature())
        const newMPM = new MPM(2)

        // kick-off pipeline
        pipeline.head?.transform(msm, newMPM)

        setInterpolationState('done')
        return newMPM.serialize()
    }

    const save = async () => {
        const creationEvent = buildThing()
            .addUrl(RDF.type, crmdig('D10_Software_Execution'))
            .addStringNoLocale(crmdig('L23_used_software_or_firmware'), 'mpm-interpolator')
            .addUrl(crmdig('L30_has_operator'), session.info.webId!)

        if (alignmentUrl) {
            creationEvent.addUrl(crmdig('L10_had_input'), alignmentUrl)
        }

        const mpm = await performInterpolation()
        if (!mpm) return 

        onCreate(creationEvent.build(), mpm)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Perform MPM Interpolation</DialogTitle>
            <DialogContent>
                <Box>
                    <Typography>On which alignment should the MPM be based on?</Typography>
                    <SelectEntity
                        title='Select Alignment'
                        type={mer('Alignment')}
                        onSelect={setAlignmentUrl} />
                </Box>
                <Box>
                    <Typography>Is there an analysis which should be taken into account?</Typography>
                    <SelectEntity
                        title='Select Analysis'
                        type={mer('Analysis')}
                        onSelect={setAnalysisUrl} />
                </Box>
                <Box>
                    {interpolationState}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={async () => {
                    await save()
                    onClose()
                }}>
                    Save</Button>
            </DialogActions>
        </Dialog>
    )
}

