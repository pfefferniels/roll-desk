import { Thing, UrlString, asUrl, buildThing, createThing, getFile, getSolidDataset, getSourceUrl, getStringNoLocale, getThing, getUrl, overwriteFile, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { DatasetContext, useSession } from "@inrupt/solid-ui-react"
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material"
import { useContext, useState } from "react"
import { crm, crmdig, frbroo, mer } from "../../../helpers/namespaces"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { SelectEntity } from "../SelectEntity"
import { datasetUrl } from "../../../helpers/datasetUrl"
import { v4 } from "uuid"

interface AlignmentDialogProps {
    // either target (to create) or an existing
    // alignment should be passed to the component.
    target?: Thing
    alignment?: Thing
    open: boolean
    onClose: () => void
}

export const AlignmentDialog = ({ alignment, target, open, onClose }: AlignmentDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)

    const [loading, setLoading] = useState(false)
    const [note, setNote] = useState(
        (alignment && getStringNoLocale(alignment, crm('P3_has_note'))) || '')
    const [scoreUrl, setScoreUrl] = useState<UrlString>()

    const saveToPod = async () => {
        if (!worksDataset) {
            console.log('No valid works dataset given')
            return
        }

        const containerUrl = getSourceUrl(worksDataset)
        if (!containerUrl) {
            console.log('unable to determine URL of the given dataset')
            return
        }

        const alignment_ = buildThing(alignment || createThing())
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(crm('P2_has_type'), mer('Alignment'))

        if (note) {
            alignment_.addStringNoLocale(crm('P3_has_note'), note)
        }

        if (target) {
            // How to use P67.1 has type?
            alignment_.addUrl(mer('has_recording'), asUrl(target))
        }

        let modifiedDataset = worksDataset
        if (scoreUrl) {
            // retrieve the score expression from its source dataset
            const scoreDataset = await getSolidDataset(scoreUrl, { fetch: session.fetch as any })
            if (!scoreDataset) return

            const scoreThing = getThing(scoreDataset, scoreUrl)
            if (!scoreThing) return

            const mei = await getFile(getUrl(scoreThing, RDFS.label) || '', { fetch: session.fetch as any })
            if (!mei) return

            const newMeiUrl = `${datasetUrl}/${v4()}.mei`
            await overwriteFile(newMeiUrl, mei, { fetch: session.fetch as any })

            // create a new score which is derived from the given score
            const newScore = buildThing()
                .addUrl(RDF.type, frbroo('F22_Self_Contained_Expression'))
                .addUrl(RDF.type, crmdig('D1_Digital_Object'))
                .addUrl(crm('P2_has_type'), mer('DigitalScore'))
                .addUrl(RDFS.label, newMeiUrl)

            const scoreWork = getUrl(scoreThing, frbroo('R12i_realises'))
            console.log('scoreWork=', scoreWork)
            if (scoreWork) {
                newScore.addUrl(frbroo('R12i_realises'), scoreWork)
            }

            // in its creation event document the provenance the score
            const creation = buildThing()
                .addUrl(RDF.type, frbroo('F28_Expression_Creation'))
                .addUrl(crm('P31_has_modified'), scoreUrl)
                .addUrl(frbroo('R17_created'), newScore.build())

            newScore.addUrl(frbroo('R17i_was_created_by'), creation.build())

            modifiedDataset = setThing(modifiedDataset, newScore.build())
            modifiedDataset = setThing(modifiedDataset, creation.build())

            alignment_.addUrl(mer('has_score'), newScore.build())
        }

        modifiedDataset = setThing(modifiedDataset, alignment_.build())

        setWorksDataset(await saveSolidDatasetAt(containerUrl, modifiedDataset, { fetch: session.fetch as any }))

        setLoading(false)
    }

    if (!alignment && !target) {
        return null
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Create/Edit Alignment
            </DialogTitle>
            <DialogContent>
                <Box mb={2}>
                    <i>
                        Note that during the course of alignment
                        a new MEI encoding will be created in parallel
                        which will represent changes in the musical text.
                    </i>
                </Box>
                <Box mb={2}>
                    <SelectEntity
                        title='Select Score'
                        type={mer('ScoreWork')}
                        secondaryType={frbroo('R12_is_realised_in')}
                        onSelect={setScoreUrl} />
                </Box>
                <Box>
                    <TextField
                        fullWidth
                        multiline
                        placeholder="Notes on this alignment"
                        value={note}
                        onChange={e => setNote(e.target.value)} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={async () => {
                    await saveToPod()
                    onClose()
                }}>
                    {loading ? <CircularProgress /> : 'Save'}</Button>
            </DialogActions>
        </Dialog>
    )
}
