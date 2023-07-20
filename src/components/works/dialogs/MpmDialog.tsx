import { Thing, UrlString, asUrl, buildThing, createThing, getSourceUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { DCTERMS, RDF } from "@inrupt/vocab-common-rdf";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress, TextField, Box, FormControl, Typography, Select, MenuItem } from "@mui/material";
import { useContext, useState } from "react";
import { crm, crmdig, dcterms, frbroo, mer } from "../../../helpers/namespaces";

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
            .addUrl(crm('P14_carried_out_by'), session.info.webId!)
            .addDatetime(DCTERMS.created, new Date(Date.now()))
            .addUrl(frbroo('R17_created'), mpmThing.build())

        mpmThing.addUrl(frbroo('R17i_was_created_by'), creationEvent.build())

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
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    disabled={loading}
                    onClick={async () => {
                        await saveToPod()
                        onClose()
                    }}>
                    {loading ? <CircularProgress /> : 'Save'}</Button>
            </DialogActions>
        </Dialog>
    )
}

