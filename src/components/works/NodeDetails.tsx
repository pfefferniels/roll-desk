import React from 'react';
import { Thing, asUrl, getUrl, getUrlAll } from '@inrupt/solid-client';
import { RDF } from '@inrupt/vocab-common-rdf';
import { crm, mer } from '../../helpers/namespaces';
import RecordingWorkDetails from './details/RecordingWorkDetails';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import DigitizedRecordingDetails from './details/DigitizedRecordingDetails';
import AnalysisDetails from './details/AnalysisDetails';
import AlignmentDetails from './details/AlignmentDetails';
import { LinkOutlined } from '@mui/icons-material';
import { IconButton } from '@mui/material';

interface NodeDetailsProps {
    node: Thing;
    onClose: () => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose }) => {
    const renderOptions = () => {
        const rdfTypes = getUrlAll(node, RDF.type);
        const type = getUrl(node, crm('P2_has_type'));

        if (rdfTypes.includes(crm('F21_Recording_Work'))) {
            return <RecordingWorkDetails thing={node} />;
        }
        else if (rdfTypes.includes(crm('F26_Recording'))) {
            return <DigitizedRecordingDetails thing={node} />
        }
        else if (type === mer('Analysis')) {
            return <AnalysisDetails thing={node} />
        }
        else if (type === mer('Alignment')) {
            return <AlignmentDetails thing={node} />
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
