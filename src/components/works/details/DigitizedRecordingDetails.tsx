import React, { useState } from 'react';
import { Thing, getUrl } from '@inrupt/solid-client';
import { Typography, Box, Button, IconButton } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { RDFS } from '@inrupt/vocab-common-rdf';
import { Edit } from '@mui/icons-material';
import { RollCopyDialog } from '../dialogs/RollCopyDialog';
import { InterpretationDialog } from '../dialogs/InterpretationDialog';

interface DigitizedRecordingDetailsProps {
  thing: Thing;
}

const DigitizedRecordingDetails: React.FC<DigitizedRecordingDetailsProps> = ({ thing }) => {
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [interpretationDialogOpen, setInterpretationDialogOpen] = useState(false)

  const handleCreateInterpretation = () => {
    // This will open a dialog which allows creating
    // an interpretation or analysis of this particular
    // roll recording.
    setInterpretationDialogOpen(true)
  }

  return (
    <Box>
      <Typography variant="h5">Details</Typography>
      <IconButton onClick={() => setEditDialogOpen(true)}>
        <Edit />
      </IconButton>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateInterpretation}
        >
          Create Interpretation
        </Button>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/midi?url=${encodeURIComponent(getUrl(thing, RDFS.label) || '')}`)}
        >
          View
        </Button>
      </Box>

      <RollCopyDialog thing={thing} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
      <InterpretationDialog open={interpretationDialogOpen} onClose={() => setInterpretationDialogOpen(false)} attachToRoll={thing} />
    </Box >
  );
};

export default DigitizedRecordingDetails;
