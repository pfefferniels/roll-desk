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
    Divider,
    ListItemButton
} from '@mui/material';
import { asJsonLd, asXML, Edition } from 'linked-rolls';
import { downloadFile } from '../../helpers/downloadFile';

interface DownloadDialogProps {
    open: boolean;
    onClose: () => void;
    edition: Edition;
}

const DownloadDialog: React.FC<DownloadDialogProps> = ({ open, onClose, edition }) => {
    const downloadXML = () => {
        const xml = asXML(edition)
        if (!xml.length) return
        downloadFile('roll.xml', xml, 'application/xml')
    }

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
                        <ListItemButton onClick={downloadXML}>
                            <ListItemText
                                primary="TEI/XML"
                                secondary={`
                                    The edition will be transformed into a hierarchical 
                                    structure which then can be serialized into a TEI-like 
                                    XML format. This feature is experimental and currently 
                                    not recommended.
                                `} />
                        </ListItemButton>
                    </ListItem>
                    <Divider />
                    <ListItem>
                        <ListItemButton onClick={downloadJsonLd}>
                            <ListItemText
                                primary="JSON-LD"
                                secondary={`
                                    The edition will be serialized using the 
                                    the Roll-O data model. This format is recommended.`} />
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
