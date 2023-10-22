import { useContext, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    CircularProgress,
    Typography,
} from '@mui/material';
import { getSourceUrl, buildThing, createThing, setThing, saveSolidDatasetAt, Thing, getStringNoLocale, getUrl, setUrl } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import { RDF, RDFS } from '@inrupt/vocab-common-rdf';
import { crm, frbroo, mer } from '../../../helpers/namespaces';

interface RollDialogProps {
    thing?: Thing;
    open: boolean;
    onClose: () => void;
}

export const RollDialog = ({ thing, open, onClose }: RollDialogProps) => {
    const [label, setLabel] = useState((thing && getStringNoLocale(thing, crm('P102_has_title'))) || '');
    const [note, setNote] = useState((thing && getUrl(thing, crm('P3_has_note'))) || '')
    const [seeAlso, setSeeAlso] = useState((thing && getUrl(thing, RDFS.seeAlso)) || '');

    const [loading, setLoading] = useState(false);

    const { session } = useSession();
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)

    const saveToPod = async () => {
        setLoading(true);

        if (!worksDataset) {
            console.log('No works dataset specified');
            return;
        }

        const containerUrl = getSourceUrl(worksDataset);

        if (!containerUrl) {
            console.log('Failed determining container URL')
            return;
        }

        const recordingWork = buildThing(thing || createThing())
            .setUrl(RDF.type, frbroo('F21_Recording_Work'))
            .setUrl(crm('P2_has_type'), mer('RecordingWork'))
            .setStringNoLocale(crm('P102_has_title'), label)

        if (seeAlso !== '') {
            recordingWork.setStringNoLocale(RDFS.seeAlso, seeAlso)
        }

        if (note !== '') {
            recordingWork.setStringNoLocale(crm('P3_has_note'), note)
        }

        const updatedDataset = setThing(worksDataset, recordingWork.build())

        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }));
        setLoading(false);

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add Roll</DialogTitle>
            <DialogContent>
                <DialogContentText>Enter the details of the roll.</DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Label"
                    fullWidth
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="see also ..."
                    fullWidth
                    value={seeAlso}
                    onChange={(e) => setSeeAlso(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="Note"
                    fullWidth
                    multiline
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <Typography>
                    <i>
                        Note: This adds an abstract work. You can upload MIDI
                        files of particular roll copies in a second step.
                    </i>
                </Typography>

            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={saveToPod} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Add Roll'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RollDialog;
