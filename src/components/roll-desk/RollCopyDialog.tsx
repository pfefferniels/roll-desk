import { Thing, asUrl, buildThing, createThing, getSourceUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { RDF, RDFS } from "@inrupt/vocab-common-rdf";
import { MusicNote } from "@mui/icons-material";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress, Stack, TextField } from "@mui/material";
import { useContext, useState } from "react";
import { crm, crmdig, frbroo, mer } from "../../helpers/namespaces"

interface DigitizedRecordingDialogProps {
    // the F26 Recording
    thing?: Thing

    // the F21 Recording Work to which attach 
    // the F26 Recording to when creating a new F26
    attachTo?: Thing
    open: boolean
    onClose: () => void
    onDone: (itemLink: string, rollAnalysis: string) => void
}

export const RollCopyDialog = ({ thing, attachTo, open, onClose, onDone }: DigitizedRecordingDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState<string>()
    const [itemLink, setItemLink] = useState<string>()

    const [loading, setLoading] = useState<'saving-expression' | false>(false)

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

        const recording = buildThing(thing || createThing())
            .addUrl(RDF.type, frbroo('F26_Recording'))
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(crm('P2_has_type'), mer('DigitalRecording'))

        if (title) {
            recording.addStringNoLocale(crm('P102_has_title'), title)
        }

        let updatedDataset = worksDataset

        if (attachTo) {
            recording.addUrl(frbroo('R12i_realises'), attachTo)
            const updatedWork = buildThing(attachTo)
                .addUrl(frbroo('R12_is_realised_in'), asUrl(recording.build(), containerUrl))
                .build()
            updatedDataset = setThing(updatedDataset, updatedWork)
        }

        updatedDataset = setThing(updatedDataset, recording.build())


        setLoading('saving-expression')
        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))

        setItemLink(asUrl(recording.build()))

        setLoading(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Stack spacing={2} p={1}>
                    <TextField
                        size='small'
                        label='Title'
                        value={title}
                        onChange={e => setTitle(e.target.value)} />
                    <Button variant="contained" component="label" startIcon={< MusicNote />}>
                        Upload Roll Analysis
                        <input
                            type="file"
                            hidden
                            accept=".txt"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={async () => {
                    await saveToPod()
                    onDone(title || '', await file?.text() || '')
                    onClose()
                }}>
                    {loading ? <CircularProgress /> : 'Save'}</Button>
            </DialogActions>
        </Dialog>
    )
}

