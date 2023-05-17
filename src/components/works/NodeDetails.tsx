import React from 'react';
import { Thing, getUrlAll } from '@inrupt/solid-client';
import { RDF } from '@inrupt/vocab-common-rdf';
import { crm } from '../../helpers/namespaces';
import RecordingWorkDetails from './RecordingWorkDetails';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import DigitizedRecordingDetails from './DigitizedRecordingDetails';

interface NodeDetailsProps {
    node: Thing;
    onClose: () => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose }) => {
    const renderOptions = () => {
        const rdfTypes = getUrlAll(node, RDF.type);

        if (rdfTypes.includes(crm('F21_Recording_Work'))) {
            return <RecordingWorkDetails thing={node} />;
        } else if (rdfTypes.includes(crm('F26_Recording'))) {
            return <DigitizedRecordingDetails thing={node} />
        }

        return null;
    };

    return (
        <Drawer anchor="right" open={true} onClose={onClose}>
            <Box sx={{ width: 300, padding: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Node Details
                </Typography>
                {renderOptions()}
            </Box>
        </Drawer>
    );
};

export default NodeDetails;
