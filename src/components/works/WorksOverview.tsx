import React, { useState, useEffect } from 'react';
import WorksGraph from './WorksGraph2';
import { SolidDataset, getSolidDataset } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import RollDialog from './dialogs/RollDialog';
import { SpeedDial, SpeedDialIcon, SpeedDialAction, Snackbar } from '@mui/material';
import { Add } from '@mui/icons-material';
import { datasetUrl } from '../../helpers/datasetUrl';
import { useSnackbar } from '../../providers/SnackbarContext';

const WorksOverview: React.FC = () => {
  const { session } = useSession()
  const { setMessage } = useSnackbar()

  const [dataset, setDataset] = useState<SolidDataset>();
  const [openAddWorkDialog, setOpenAddWorkDialog] = useState(false);

  useEffect(() => {
    const fetchThings = async () => {
      try {
        setMessage(`Loading dataset at ${datasetUrl}`)
        const solidDataset = await getSolidDataset(`${datasetUrl}/works.ttl`, { fetch: session.fetch as any });
        setDataset(solidDataset)
        setMessage('Done loading')
      } catch (error) {
        console.error('Error fetching Things:', error);
      }
    };

    fetchThings();
  }, [session.fetch, session.info.isLoggedIn]);

  const handleOpenAddWorkDialog = () => {
    setOpenAddWorkDialog(true);
  };

  const handleCloseAddWorkDialog = () => {
    setOpenAddWorkDialog(false);
  };

  const actions = [
    { name: 'Add Roll Recording', icon: <Add />, onClick: handleOpenAddWorkDialog },
  ];

  return (
    <DatasetContext.Provider value={{
      solidDataset: dataset,
      setDataset
    }}>
      {session.info.isLoggedIn && (
        <SpeedDial
          ariaLabel="Add Entities"
          sx={{ position: 'fixed', bottom: 16, left: 16 }}
          icon={<SpeedDialIcon />}
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
      )}

      <WorksGraph />

      <RollDialog
        open={openAddWorkDialog}
        onClose={handleCloseAddWorkDialog}
      />
    </DatasetContext.Provider>
  );
};

export default WorksOverview;