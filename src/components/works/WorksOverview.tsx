import React, { useState, useEffect } from 'react';
import WorksGraph from './WorksGraph';
import { SolidDataset, getSolidDataset } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import RecordingWorkDialog from './dialogs/RecordingWorkDialog';
import { SpeedDial, SpeedDialIcon, SpeedDialAction } from '@mui/material';
import { MusicNote, RecordVoiceOver } from '@mui/icons-material';
import { datasetUrl } from '../../helpers/datasetUrl';
import { ScoreWorkDialog } from './dialogs/ScoreWorkDialog';

const WorksOverview: React.FC = () => {
  const { session } = useSession()
  const [dataset, setDataset] = useState<SolidDataset>();
  const [openAddWorkDialog, setOpenAddWorkDialog] = useState(false);
  const [openScoreDialog, setOpenScoreDialog] = useState(false);

  useEffect(() => {
    const fetchThings = async () => {
      try {
        const solidDataset = await getSolidDataset(`${datasetUrl}/works.ttl`, { fetch: session.fetch as any });
        setDataset(solidDataset)
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
    { name: 'Add Recording', icon: <RecordVoiceOver />, onClick: handleOpenAddWorkDialog },
    { name: 'Add Score', icon: <MusicNote />, onClick: () => setOpenScoreDialog(true) },
  ];

  return (
    <DatasetContext.Provider value={{
      solidDataset: dataset,
      setDataset
    }}>
      <h1>Works Overview</h1>

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

      <ScoreWorkDialog
        open={openScoreDialog}
        onClose={() => setOpenScoreDialog(false)} />

      <RecordingWorkDialog
        open={openAddWorkDialog}
        onClose={handleCloseAddWorkDialog}
      />
    </DatasetContext.Provider>
  );
};

export default WorksOverview;