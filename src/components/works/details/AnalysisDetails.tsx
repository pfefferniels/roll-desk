import React, { useState } from 'react';
import { Thing, getSourceUrl, getUrl } from '@inrupt/solid-client';
import { Typography, Box, Button, IconButton, Dialog } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { RDFS } from '@inrupt/vocab-common-rdf';
import { Edit } from '@mui/icons-material';
import { DigitizedRecordingDialog } from '../DigitizedRecordingDialog';
import { AlignmentDialog } from '../AlignmentDialog';
import { AnalysisDialog } from '../AnalysisDialog';

interface AnalysisDetailsProps {
  thing: Thing;
}

const AnalysisDetails: React.FC<AnalysisDetailsProps> = ({ thing }) => {
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

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
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/analysis?url=${thing.url}`)}
        >
          View
        </Button>
      </Box>

      <AnalysisDialog analysis={thing} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </Box>
  );
};

export default AnalysisDetails;
