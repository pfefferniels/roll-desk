import React, { useState } from 'react';
import { Thing, asUrl, getUrl } from '@inrupt/solid-client';
import { Typography, Box, Button, IconButton } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { RDFS } from '@inrupt/vocab-common-rdf';
import { Edit } from '@mui/icons-material';
import { DigitizedRecordingDialog } from '../DigitizedRecordingDialog';
import { AlignmentDialog } from '../AlignmentDialog';
import { AnalysisDialog } from '../AnalysisDialog';

interface DigitizedRecordingDetailsProps {
  thing: Thing;
}

const DigitizedRecordingDetails: React.FC<DigitizedRecordingDetailsProps> = ({ thing }) => {
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [alignmentDialogOpen, setAlignmentDialogOpen] = useState(false)
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)

  const handleAlignToScore = () => {
    // This will open a dialog which allows selecting
    // a stored score. Selecting one will create a 
    // duplicate of that score (since we assume that 
    // performing a score always means altering the score).
    // It then opens a new window which allows editing
    // an alignment.
    setAlignmentDialogOpen(true)
  };

  const handleCreateInterpretation = () => {
    // This will open a dialog which allows creating
    // an interpretation or analysis of this particular
    // roll recording.
    setAnalysisDialogOpen(true)
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
        <Button variant="contained" color="primary" onClick={handleAlignToScore}>
          Align to Score
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

      <DigitizedRecordingDialog thing={thing} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
      <AlignmentDialog target={thing} open={alignmentDialogOpen} onClose={() => setAlignmentDialogOpen(false)} />
      <AnalysisDialog target={thing} open={analysisDialogOpen} onClose={() => setAnalysisDialogOpen(false)} />
    </Box>
  );
};

export default DigitizedRecordingDetails;
