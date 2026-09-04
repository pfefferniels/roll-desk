import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
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
    onDownloadMIDI?: () => void;
    onDownloadAllMIDI?: () => Promise<void>;
    versionSiglum?: string;
    versionCount?: number;
}

/** The archive is rendered synchronously, so give the spinner a frame to appear first. */
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))

const DownloadDialog: React.FC<DownloadDialogProps> = ({
    open,
    onClose,
    edition,
    onDownloadMIDI,
    onDownloadAllMIDI,
    versionSiglum,
    versionCount = 0
}) => {
    const [renderingArchive, setRenderingArchive] = useState(false)

    const downloadJsonLd = () => {
        const jsonld = asJsonLd(edition)
        downloadFile('roll.json', JSON.stringify(jsonld, null, 4), 'application/ld+json')
    }

    const downloadAllMIDI = async () => {
        setRenderingArchive(true)
        try {
            await nextFrame()
            await onDownloadAllMIDI?.()
            onClose()
        } finally {
            setRenderingArchive(false)
        }
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
                    <ListItem>
                        <ListItemButton
                            disabled={!versionSiglum}
                            onClick={() => {
                                onDownloadMIDI?.()
                                onClose()
                            }}
                        >
                            <ListItemText
                                primary={versionSiglum ? `MIDI (${versionSiglum})` : 'MIDI'}
                                secondary={versionSiglum
                                    ? 'Download the selected version as a MIDI file.'
                                    : 'Select a version to enable MIDI download.'
                                } />
                        </ListItemButton>
                    </ListItem>
                    <ListItem
                        secondaryAction={renderingArchive ? <CircularProgress size={20} /> : undefined}
                    >
                        <ListItemButton
                            disabled={versionCount === 0 || renderingArchive}
                            onClick={downloadAllMIDI}
                        >
                            <ListItemText
                                primary='MIDI, all versions (ZIP)'
                                secondary={versionCount === 0
                                    ? 'The edition contains no versions yet.'
                                    : `Emulate every version of this edition (${versionCount}) and download the MIDI files as a ZIP archive.`
                                } />
                        </ListItemButton>
                    </ListItem>
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant='outlined' disabled={renderingArchive}>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DownloadDialog;
