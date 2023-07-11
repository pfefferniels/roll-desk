import { Thing, asUrl, buildThing, createThing, getSourceUrl, saveSolidDatasetAt, setDate, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { RDF, RDFS } from "@inrupt/vocab-common-rdf";
import { MusicNote } from "@mui/icons-material";
import { TextField, Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress } from "@mui/material";
import { useContext, useState } from "react";
import { createUrl } from "../../helpers/createUrl";
import { crm, crmdig } from "../../helpers/namespaces";
import { midi2ld } from "../../lib/midi/midi2ld";
import { MidiFile, read } from "midifile-ts";

const parseMidiInput = (
    file: File
): Promise<MidiFile | null> => {
    return new Promise(resolve => {
        const reader = new FileReader()

        reader.onload = e => {
            if (e.target == null) {
                resolve(null)
                return
            }
            const buf = e.target.result as ArrayBuffer
            const midi = read(buf)
            resolve(midi)
        }

        reader.readAsArrayBuffer(file)
    });
}

interface DigitizedRecordingDialogProps {
    // the F26 Recording
    thing?: Thing

    // the F21 Recording Work to which attach 
    // the F26 Recording to when creating a new F26
    attachTo?: Thing
    open: boolean
    onClose: () => void
}

export const DigitizedRecordingDialog = ({ attachTo, open, onClose }: DigitizedRecordingDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)
    const [midiFile, setMidiFile] = useState<File | null>(null);

    const [loading, setLoading] = useState<'saving-midi' | 'saving-expression' | false>(false)

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

        const recording = buildThing(createThing())
            .addUrl(RDF.type, crm('F26_Recording'))
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))

        if (midiFile) {
            const midi = await parseMidiInput(midiFile)

            if (midi) {
                const midiLd = midi2ld(midi, { calculateImprecision: false });

                recording.addUrl(RDFS.label, `https://measuring-early-records.org/midi/${midiLd.name}`)

                // Save the RDF dataset in the pod
                const midiDatasetUrl = `https://pfefferniels.solidcommunity.net/early-recordings/${midiLd.name}.ttl`

                setLoading('saving-midi')
                await saveSolidDatasetAt(midiDatasetUrl, midiLd.dataset, { fetch: session.fetch as any })
            }
        }

        let updatedDataset = setThing(worksDataset, recording.build())

        if (attachTo) {
            const updatedWork = buildThing(attachTo)
                .addUrl(crm('R12_is_realized_in'), asUrl(recording.build(), containerUrl))
                .build()
            updatedDataset = setThing(updatedDataset, updatedWork)
        }

        setLoading('saving-expression')
        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))

        setLoading(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add/Edit Recording Expression</DialogTitle>
            <DialogContent>
                <Button variant="contained" component="label" startIcon={< MusicNote />}>
                    Upload MIDI
                    <input
                        type="file"
                        hidden
                        accept=".mid"
                        onChange={(e) => setMidiFile(e.target.files ? e.target.files[0] : null)}
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

