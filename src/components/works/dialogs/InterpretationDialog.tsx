import { Thing, asUrl, buildThing, createThing, getSourceUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { DCTERMS, RDF } from "@inrupt/vocab-common-rdf";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress, Stack, Typography, TextField } from "@mui/material";
import { useContext, useState } from "react";
import { crm, crmdig, frbroo, mer } from "../../../helpers/namespaces";

interface InterpretationDialogProps {
    // the expression
    interpretation?: Thing

    // the mer:Roll to which attach 
    // the interpretation to when creating
    attachToRoll?: Thing
    open: boolean
    onClose: () => void
}

export const InterpretationDialog = ({ interpretation, attachToRoll, open, onClose }: InterpretationDialogProps) => {
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

        const interpretationThing = buildThing(interpretation || createThing())
            .setUrl(RDF.type, frbroo('F1_Work'))
            .setUrl(crm('P2_has_type'), mer('Interpretation'))

        if (attachToRoll) {
            interpretationThing.setUrl(frbroo('R2_is_derivative_of'), attachToRoll)
        }

        const mpmThing = buildThing(createThing())
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

        if (attachToRoll) {
            creationEvent.addUrl(frbroo('R19_created_a_realisation_of'), interpretationThing.build())

            const updatedInterpretation = interpretationThing
                .setUrl(frbroo('R12_is_realised_in'), asUrl(mpmThing.build(), containerUrl))
                .build()

            updatedDataset = setThing(updatedDataset, updatedInterpretation)
        }
        updatedDataset = setThing(updatedDataset, creationEvent.build())

        setLoading(true)
        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))
        setLoading(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{interpretation ? 'Edit' : 'Add'} Interpretation</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    <TextField fullWidth variant='filled' size='small' label='Title' />
                    <TextField fullWidth variant='filled' size='small' label='Author' placeholder="https://..." />
                    <Typography>
                        <i>The author should be specified using a URL. If not specified,
                            the currently logged-in user is assumed to be the author.</i>
                    </Typography>
                    <TextField fullWidth variant='filled' size='small' label='Date' />
                    <Typography>
                        <i>If not specifed, the current date will be assumed.</i>
                    </Typography>
                    <Stack direction='row' spacing={2}>
                        <Button variant="contained">Upload MEI</Button>
                        <Typography>
                            <i>If no MEI is specified, an empty skeleton will be
                                created which can be edited at a later stage.</i>
                        </Typography>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
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

