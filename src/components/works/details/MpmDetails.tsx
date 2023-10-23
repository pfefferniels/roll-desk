import React, { useState } from 'react';
import { Thing, asUrl } from '@inrupt/solid-client';
import { Typography, Box, Button, IconButton } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { Edit } from '@mui/icons-material';
import { InterpretationDialog } from '../dialogs/InterpretationDialog';

interface MpmDetailsProps {
  thing: Thing;
}

const MpmDetails = ({ thing }: MpmDetailsProps) => {
  const navigate = useNavigate()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <Box>
      <Box>
        <IconButton onClick={() => setEditDialogOpen(true)}>
          <Edit />
        </IconButton>
        <Typography variant="h5" display="inline">
          MPM Details
        </Typography>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/mpm?url=${encodeURIComponent(asUrl(thing))}`)}
        >
          View
        </Button>
      </Box>

      <InterpretationDialog interpretation={thing} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </Box>
  );
};

export default MpmDetails;
