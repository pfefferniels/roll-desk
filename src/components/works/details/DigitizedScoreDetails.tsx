import React, { useState } from 'react';
import { Thing, asUrl, getUrl } from '@inrupt/solid-client';
import { Typography, Box, Button, IconButton } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { Edit } from '@mui/icons-material';
import { DigitizedScoreDialog } from '../dialogs/DigitizedScoreDialog';
import { RDFS } from '@inrupt/vocab-common-rdf';

interface DigitizedScoreDetailsProps {
  thing: Thing;
}

export const DigitizedScoreDetails: React.FC<DigitizedScoreDetailsProps> = ({ thing }) => {
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <Box>
      <Typography variant="h5">Score Details</Typography>
      <IconButton onClick={() => setEditDialogOpen(true)}>
        <Edit />
      </IconButton>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/score?url=${encodeURIComponent(getUrl(thing, RDFS.label) || '')}`)}
        >
          View
        </Button>
      </Box>

      <DigitizedScoreDialog thing={thing} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </Box>
  );
};
