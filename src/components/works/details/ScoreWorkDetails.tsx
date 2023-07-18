import { useState } from 'react';
import { Thing } from '@inrupt/solid-client';
import { getStringNoLocale } from '@inrupt/solid-client';
import { RDFS } from '@inrupt/vocab-common-rdf';
import { Typography, Box, IconButton } from '@mui/material';
import { ScoreWorkDialog } from '../dialogs/ScoreWorkDialog';
import { SpeedDial, SpeedDialAction } from '@mui/material';
import AddPerformanceIcon from '@mui/icons-material/Theaters';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { DigitizedScoreDialog } from '../dialogs/DigitizedScoreDialog';

interface ScoreWorkDetailsProps {
    thing: Thing;
}

const ScoreWorkDetails = ({ thing }: ScoreWorkDetailsProps) => {
    const label = getStringNoLocale(thing, RDFS.label);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
    const [speedDialOpen, setSpeedDialOpen] = useState(false);

    const actions = [
        { icon: <AddPerformanceIcon />, name: 'Add Digitized Score', onClick: () => setScoreDialogOpen(true) },
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

            <ScoreWorkDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                thing={thing}
            />

            <DigitizedScoreDialog
                attachTo={thing}
                open={scoreDialogOpen}
                onClose={() => setScoreDialogOpen(false)}
            />
        </Box>
    );
};

export default ScoreWorkDetails;