import { Thing, asUrl, buildThing, createThing, getSourceUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { DatasetContext, useSession } from "@inrupt/solid-ui-react"
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material"
import { useContext, useState } from "react"
import { crm, crmdig, mer } from "../../helpers/namespaces"
import { createUrl } from "../../helpers/createUrl"
import { RDF } from "@inrupt/vocab-common-rdf"

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
    const [note, setNote] = useState('')

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

        const alignment = buildThing(createThing())
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(crm('P2_has_type'), mer('Alignment'))

        if (note) {
            alignment.addStringNoLocale(crm('P3_has_note'), note)
        }

        if (target) {
            // How to use P67.1 has type?
            alignment.addUrl(crm('P67_refers_to'), asUrl(target))
        }

        let updatedDataset = setThing(worksDataset, alignment.build())

        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))

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
                    <Button variant='contained'>Select Score</Button>
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
