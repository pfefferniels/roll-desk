import React, { useState, useEffect } from 'react';
import WorksGraph from './WorksGraph';
import { SolidDataset, getSolidDataset } from '@inrupt/solid-client';
import Button from '@mui/material/Button';
import { datasetUrl } from '../../helpers/datasetUrl';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import RecordingWorkDialog from './RecordingWorkDialog';
import ScoreDialog from './ScoreDialog';

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

  return (
    <DatasetContext.Provider value={{
      solidDataset: dataset,
      setDataset
    }}>
      <h1>Works Overview</h1>

      <Button
        variant="contained"
        color="primary"
        onClick={handleOpenAddWorkDialog}
      >
        Add Recording
      </Button>
      <WorksGraph />

      <ScoreDialog
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
