import { Thing, asUrl, buildThing, createThing, getSourceUrl, getStringNoLocale, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { useSession, DatasetContext } from "@inrupt/solid-ui-react"
import { RDF } from "@inrupt/vocab-common-rdf"
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material"
import { useContext, useState } from "react"
import { crmdig, crm, mer, frbroo } from "../../helpers/namespaces"

interface AnalysisDialogProps {
    // either target (to create) or an existing
    // analysis should be passed to the component.
    analysis?: Thing
    target?: Thing
    open: boolean
    onClose: () => void
}

export const AnalysisDialog = ({ analysis, target, open, onClose }: AnalysisDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)

    const [loading, setLoading] = useState(false)
    const [note, setNote] = useState(
        (analysis && getStringNoLocale(analysis, crm('P3_has_note'))) || '')

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

        const analysis_ = buildThing(analysis || createThing())
            .addUrl(RDF.type, frbroo('F1_Work'))
            .addUrl(RDF.type, frbroo('F23_Expression_Fragment'))
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(RDF.type, crm('E7_Activity'))
            .addUrl(crm('P2_has_type'), mer('Analysis'))

        if (note) {
            analysis_.addStringNoLocale(crm('P3_has_note'), note)
        }

        if (target) {
            // How to use P67.1 has type?
            analysis_.addUrl(crm('P67_refers_to'), asUrl(target))
        }

        let updatedDataset = setThing(worksDataset, analysis_.build())

        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))

        setLoading(false)
    }

    if (!analysis && !target) {
        return null
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Create/Edit Interpretation
            </DialogTitle>
            <DialogContent>
                <Box mb={1}>
                    <TextField
                        fullWidth
                        multiline
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Notes on this interpretation" />
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