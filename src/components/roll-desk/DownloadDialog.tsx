import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemButton
} from '@mui/material';
import { asJsonLd, Edition } from 'linked-rolls';
import { downloadFile } from '../../helpers/downloadFile';

interface DownloadDialogProps {
    open: boolean;
    onClose: () => void;
    edition: Edition;
}

const DownloadDialog: React.FC<DownloadDialogProps> = ({ open, onClose, edition }) => {
    const downloadJsonLd = () => {
        const jsonld = asJsonLd(edition)
        downloadFile('roll.json', JSON.stringify(jsonld, null, 4), 'application/ld+json')
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Download</DialogTitle>
            <DialogContent>
                <List>
                    <ListItem>
                        <ListItemButton onClick={downloadJsonLd}>
                            <ListItemText
                                primary="JSON-LD"
                                secondary={`
                                    The edition will be serialized using the JSON-LD format, 
                                    based on Roll-O data model. This format is recommended.`} />
                        </ListItemButton>
                    </ListItem>
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant='outlined'>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DownloadDialog;
