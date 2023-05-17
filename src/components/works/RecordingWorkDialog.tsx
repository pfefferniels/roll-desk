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
} from '@mui/material';
import { getSourceUrl, buildThing, createThing, setThing, saveSolidDatasetAt, Thing, getStringNoLocale, getUrl, setUrl } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import { RDF, RDFS } from '@inrupt/vocab-common-rdf';
import { crm } from '../../helpers/namespaces';
import { createUrl } from '../../helpers/createUrl';

interface RecordingWorkDialogProps {
    thing?: Thing;
    open: boolean;
    onClose: () => void;
}

export const RecordingWorkDialog = ({ thing, open, onClose }: RecordingWorkDialogProps) => {
    const [label, setLabel] = useState((thing && getStringNoLocale(thing, RDFS.label)) || '');
    const [memberOf, setMemberOf] = useState((thing && getUrl(thing, crm('R10i_is_member_of'))) || '')
    const [derivedFrom, setDerivedFrom] = useState((thing && getUrl(thing, crm('R2_is_derivative_of'))) || '');

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

        const recordingWork = buildThing(thing || createThing({
            url: createUrl()
        }))
            .setUrl(RDF.type, crm('F21_Recording_Work'))
            .setStringNoLocale(RDFS.label, label)

        if (derivedFrom !== '') {
            recordingWork.setStringNoLocale(crm('R2_is_derivative_of'), derivedFrom)
        }

        if (memberOf !== '') {
            recordingWork.setStringNoLocale(crm('R10i_is_member_of'), memberOf)
        }

        const updatedDataset = setThing(worksDataset, recordingWork.build())

        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }));
        setLoading(false);

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add Recording Work</DialogTitle>
            <DialogContent>
                <DialogContentText>Enter the details of the performance.</DialogContentText>
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
                    label="Member Of"
                    fullWidth
                    value={memberOf}
                    onChange={(e) => setMemberOf(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="Derived From"
                    fullWidth
                    value={derivedFrom}
                    onChange={(e) => setDerivedFrom(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={saveToPod} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Add Performance'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RecordingWorkDialog;
