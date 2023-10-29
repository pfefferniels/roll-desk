import { useState } from 'react';
import { Thing, asUrl } from '@inrupt/solid-client';
import { getStringNoLocale } from '@inrupt/solid-client';
import { Typography, Box, IconButton, Stack, Button } from '@mui/material';
import { RollDialog } from '../dialogs/RollDialog';
import EditIcon from '@mui/icons-material/Edit';
import { RollCopyDialog } from '../dialogs/RollCopyDialog';
import { InterpretationDialog } from '../dialogs/InterpretationDialog';
import { useNavigate } from 'react-router-dom';
import { crm } from '../../../helpers/namespaces';

interface RecordingWorkDetailsProps {
    thing: Thing;
}

const RecordingWorkDetails = ({ thing: work }: RecordingWorkDetailsProps) => {
    const navigate = useNavigate()
    const label = getStringNoLocale(work, crm('P102_has_title'));
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
                <Box mt={2}>
                    <Button
                        variant='contained'
                        onClick={() => navigate(`/work?url=${encodeURIComponent(asUrl(work))}`)}>
                        View
                    </Button>
                </Box>

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

            <InterpretationDialog
                open={mpmDialogOpen}
                onClose={() => setMpmDialogOpen(false)}
                attachToRoll={work} />

            <RollDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                thing={work}
            />

            <RollCopyDialog
                attachTo={work}
                open={performanceDialogOpen}
                onClose={() => setPerformanceDialogOpen(false)}
            />
        </Box >
    );
};

export default RecordingWorkDetails;