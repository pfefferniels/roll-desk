import { Thing, asUrl, buildThing, createThing, getSourceUrl, overwriteFile, saveFileInContainer, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { RDF, RDFS } from "@inrupt/vocab-common-rdf";
import { MusicNote } from "@mui/icons-material";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress } from "@mui/material";
import { useContext, useState } from "react";
import { crm, crmdig, frbroo, mer } from "../../../helpers/namespaces";
import { v4 } from "uuid";
import { datasetUrl } from "../../../helpers/datasetUrl";

interface DigitizedScoreDialogProps {
    // the F26 Expression
    thing?: Thing

    // the F1 Work to which attach the
    // F22 Self-Contained Expression to
    // when creating a new F26
    attachTo?: Thing
    open: boolean
    onClose: () => void
}

export const DigitizedScoreDialog = ({ thing, attachTo, open, onClose }: DigitizedScoreDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)
    const [meiFile, setMeiFile] = useState<File | null>(null);

    const [loading, setLoading] = useState<'saving-mei' | 'saving-expression' | false>(false)

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

        const score = buildThing(thing || createThing())
            .addUrl(RDF.type, frbroo('F22_Self_Contained_Expression'))
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(crm('P2_has_type'), mer('DigitalScore'))

        if (meiFile) {
            // TODO: use private pod instead
            const meiUrl = `${datasetUrl}/${v4()}.mei`

            setLoading('saving-mei')
            const savedFile = await overwriteFile(meiUrl, meiFile, { fetch: session.fetch as any })
            if (savedFile) {
                // Save the the file
                score.addUrl(RDFS.label, meiUrl)
            }
        }
        let updatedDataset = setThing(worksDataset, score.build())

        if (attachTo) {
            const updatedWork = buildThing(attachTo)
                .addUrl(crm('R12_is_realized_in'), asUrl(score.build(), containerUrl))
                .build()
            updatedDataset = setThing(updatedDataset, updatedWork)
        }

        setLoading('saving-expression')
        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))

        setLoading(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add/Edit MEI File</DialogTitle>
            <DialogContent>
                <Button variant="contained" component="label" startIcon={< MusicNote />}>
                    Upload MEI
                    <input
                        type="file"
                        hidden
                        accept=".mei"
                        onChange={(e) => setMeiFile(e.target.files ? e.target.files[0] : null)}
                    />
                </Button>
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

