import { Thing, UrlString, asUrl, buildThing, createThing, getSourceUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { RDF } from "@inrupt/vocab-common-rdf";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress, TextField, Box, FormControl, Typography, Select, MenuItem } from "@mui/material";
import { useContext, useState } from "react";
import { crm, crmdig, frbroo, mer } from "../../../helpers/namespaces";
import { SelectEntity } from "../SelectEntity";

interface MpmDialogProps {
    // the expression
    mpm?: Thing

    // the F21 Recording Work to which attach 
    // the MPM to when creating
    attachTo?: Thing
    open: boolean
    onClose: () => void
}

export const MpmDialog = ({ mpm, attachTo, open, onClose }: MpmDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)

    const [alignmentUrl, setAlignmentUrl] = useState<UrlString>()
    const [analysisUrl, setAnalysisUrl] = useState<UrlString>()
    const [loading, setLoading] = useState(false)

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

        const mpmThing = buildThing(mpm || createThing())
            .addUrl(RDF.type, frbroo('F22_Self_Contained_Expression'))
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(crm('P2_has_type'), mer('MPM'))

        const creationEvent = buildThing()
            .addUrl(RDF.type, frbroo('F28_Expression_Creation'))
            .addUrl(frbroo('R17_created'), mpmThing.build())

        if (alignmentUrl) {
            creationEvent.addUrl(crm('P16_used_specific_object'), alignmentUrl)
        }

        let updatedDataset = setThing(worksDataset, mpmThing.build())

        if (attachTo) {
            creationEvent.addUrl(frbroo('R19_created_a_realisation_of'), attachTo)

            const updatedWork = buildThing(attachTo)
                .addUrl(crm('R12_is_realized_in'), asUrl(mpmThing.build(), containerUrl))
                .build()

            updatedDataset = setThing(updatedDataset, updatedWork)
        }
        updatedDataset = setThing(updatedDataset, creationEvent.build())

        setLoading(true)
        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))
        setLoading(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add/Edit MPM</DialogTitle>
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
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={async () => {
                    await saveToPod()
                    onClose()
                }}>
                    {loading ? <CircularProgress /> : 'Save'}</Button>
            </DialogActions>
        </Dialog>
    )
}

