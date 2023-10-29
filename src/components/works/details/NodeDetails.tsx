import React from 'react';
import { Thing, asUrl, getUrl } from '@inrupt/solid-client';
import { crm, mer } from '../../../helpers/namespaces';
import RecordingWorkDetails from './RecordingWorkDetails';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import DigitizedRecordingDetails from './DigitizedRecordingDetails';
import { LinkOutlined } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import MpmDetails from './MpmDetails';

interface NodeDetailsProps {
    node: Thing;
    onClose: () => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose }) => {
    const renderOptions = () => {
        const type = getUrl(node, crm('P2_has_type'));

        if (type === mer('RecordingWork')) {
            return <RecordingWorkDetails thing={node} />;
        }
        else if (type === mer('DigitalRecording')) {
            return <DigitizedRecordingDetails thing={node} />
        }
        else if (type === mer('MPM')) {
            return <MpmDetails thing={node} />;
        }

        return null;
    };

    return (
        <Drawer anchor="right" open={true} onClose={onClose}>
            <Box sx={{ width: 300, padding: 2 }}>
                <Typography variant="h6" gutterBottom>
                    <IconButton onClick={() => window.open(asUrl(node))}>
                        <LinkOutlined />
                    </IconButton>
                    Node Details
                </Typography>
                {renderOptions()}
            </Box>
        </Drawer>
    );
};

export default NodeDetails;
