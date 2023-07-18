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
import { crm, mer } from '../../../helpers/namespaces';

interface ScoreWorkDialogProps {
    thing?: Thing;
    open: boolean;
    onClose: () => void;
}

export const ScoreWorkDialog = ({ thing, open, onClose }: ScoreWorkDialogProps) => {
    const [label, setLabel] = useState((thing && getStringNoLocale(thing, RDFS.label)) || '');
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

        const scoreWork = buildThing(thing || createThing())
            .setUrl(RDF.type, crm('F1_Work'))
            .setUrl(crm('P2_has_type'), mer('ScoreWork'))
            .setStringNoLocale(RDFS.label, label)

        if (seeAlso !== '') {
            scoreWork.setStringNoLocale(RDFS.seeAlso, seeAlso)
        }

        if (note !== '') {
            scoreWork.setStringNoLocale(crm('P3_has_note'), note)
        }

        const updatedDataset = setThing(worksDataset, scoreWork.build())

        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }));
        setLoading(false);

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add Score Work</DialogTitle>
            <DialogContent>
                <DialogContentText>Enter the details of the score.</DialogContentText>
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
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={saveToPod} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Add Score'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

