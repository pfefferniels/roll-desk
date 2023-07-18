import { useState } from 'react';
import { Thing } from '@inrupt/solid-client';
import { getStringNoLocale } from '@inrupt/solid-client';
import { RDFS } from '@inrupt/vocab-common-rdf';
import { Typography, Box, IconButton, Stack, Button } from '@mui/material';
import { RecordingWorkDialog } from '../dialogs/RecordingWorkDialog';
import EditIcon from '@mui/icons-material/Edit';
import { DigitizedRecordingDialog } from '../dialogs/DigitizedRecordingDialog';
import { MpmDialog } from '../dialogs/MpmDialog';

interface RecordingWorkDetailsProps {
    thing: Thing;
}

const RecordingWorkDetails = ({ thing: work }: RecordingWorkDetailsProps) => {
    const label = getStringNoLocale(work, RDFS.label);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
    const [mpmDialogOpen, setMpmDialogOpen] = useState(false);

    return (
        <Box>
            <Box>
                <IconButton onClick={() => setEditDialogOpen(true)} size="small" sx={{ ml: 1 }}>
                    <EditIcon />
                </IconButton>
                <Typography variant="h5" display="inline">
                    {label}
                </Typography>
            </Box>

            <Stack spacing={1}>
                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setMpmDialogOpen(true)}>
                        Add MPM
                    </Button>
                </Box>
                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setPerformanceDialogOpen(true)}>
                        Add Digitized Recording
                    </Button>
                </Box>
            </Stack>

            <MpmDialog
                open={mpmDialogOpen}
                onClose={() => setMpmDialogOpen(false)}
                attachTo={work} />

            <RecordingWorkDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                thing={work}
            />

            <DigitizedRecordingDialog
                attachTo={work}
                open={performanceDialogOpen}
                onClose={() => setPerformanceDialogOpen(false)}
            />
        </Box >
    );
};

export default RecordingWorkDetails;