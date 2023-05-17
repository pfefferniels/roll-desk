import React, { useState } from 'react';
import { Thing, getUrl } from '@inrupt/solid-client';
import { Typography, Box, Button, IconButton, Dialog } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { RDFS } from '@inrupt/vocab-common-rdf';
import { Edit } from '@mui/icons-material';
import { DigitizedRecordingDialog } from './DigitizedRecordingDialog';

interface DigitizedRecordingDetailsProps {
  thing: Thing;
}

const DigitizedRecordingDetails: React.FC<DigitizedRecordingDetailsProps> = ({ thing }) => {
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const handleAlignToScore = () => {
    // Implement the logic for aligning to the score
  };

  return (
    <Box>
      <Typography variant="h5">Details</Typography>
      <IconButton onClick={() => setEditDialogOpen(true)}>
        <Edit />
      </IconButton>

      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={handleAlignToScore}>
          Align to Score
        </Button>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(new URL(getUrl(thing, RDFS.label) || '').pathname)}
        >
          Open in Editor
        </Button>
      </Box>

      <DigitizedRecordingDialog thing={thing} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </Box>
  );
};

export default DigitizedRecordingDetails;
