import React, { useState } from 'react';
import { Thing, asUrl } from '@inrupt/solid-client';
import { Typography, Box, Button, IconButton } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { Edit } from '@mui/icons-material';
import { AlignmentDialog } from '../AlignmentDialog';

interface AlignmentDetailsProps {
  thing: Thing;
}

const AlignmentDetails: React.FC<AlignmentDetailsProps> = ({ thing }) => {
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <Box>
      <Typography variant="h5">Alignment Details</Typography>
      <IconButton onClick={() => setEditDialogOpen(true)}>
        <Edit />
      </IconButton>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/alignment?url=${encodeURIComponent(asUrl(thing))}`)}
        >
          View
        </Button>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => { }}
        >
          Create MPM
        </Button>
      </Box>

      <AlignmentDialog alignment={thing} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </Box>
  );
};

export default AlignmentDetails;
