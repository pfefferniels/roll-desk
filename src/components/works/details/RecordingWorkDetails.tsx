import { useState } from 'react';
import { Thing, getUrlAll } from '@inrupt/solid-client';
import { getStringNoLocale } from '@inrupt/solid-client';
import { OWL, RDFS } from '@inrupt/vocab-common-rdf';
import { Typography, Box, Link, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { RecordingWorkDialog } from '../dialogs/RecordingWorkDialog';
import { SpeedDial, SpeedDialAction } from '@mui/material';
import AddPerformanceIcon from '@mui/icons-material/Theaters';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { DigitizedRecordingDialog } from '../dialogs/DigitizedRecordingDialog';

interface RecordingWorkDetailsProps {
    thing: Thing;
}

const RecordingWorkDetails = ({ thing }: RecordingWorkDetailsProps) => {
    const label = getStringNoLocale(thing, RDFS.label);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
    const [speedDialOpen, setSpeedDialOpen] = useState(false);

    const actions = [
        { icon: <AddPerformanceIcon />, name: 'Add Digitized Recording', onClick: () => setPerformanceDialogOpen(true) },
    ];

    return (
        <Box>
            <Box>
                <Typography variant="h5" display="inline">
                    {label}
                </Typography>
                <IconButton onClick={() => setEditDialogOpen(true)} size="small" sx={{ ml: 1 }}>
                    <EditIcon />
                </IconButton>
            </Box>

            <SpeedDial
                ariaLabel="Add Actions"
                open={speedDialOpen}
                onOpen={() => setSpeedDialOpen(true)}
                onClose={() => setSpeedDialOpen(false)}
                sx={{ position: 'absolute', bottom: 16, right: 16 }}
                icon={<AddIcon />}
            >
                {actions.map((action) => (
                    <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={action.onClick}
                    />
                ))}
            </SpeedDial>

            <RecordingWorkDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                thing={thing}
            />

            <DigitizedRecordingDialog
                attachTo={thing}
                open={performanceDialogOpen}
                onClose={() => setPerformanceDialogOpen(false)}
            />
        </Box>
    );
};

export default RecordingWorkDetails;