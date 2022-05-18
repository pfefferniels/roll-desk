import React, { ReactElement, useState } from 'react';
import './App.css';
import { SpeedDial, SpeedDialAction, SpeedDialIcon, Tab, Tabs, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/system';
import AlignmentEditor from './components/AlignmentEditor';
import InterpolationEditor from './components/InterpolationEditor';
import AnnotatedScore from './components/AnnotatedScore';
import GlobalContext from './components/GlobalContext';
import { Score } from './lib/Score'
import { RawPerformance } from './lib/Performance'
import Upload from './components/Upload'
import { AlignedPerformance } from './lib/AlignedPerformance';

function TabPanel(props: {children: ReactElement, index: string, value: string}) {
  const { children, value, index } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-auto-tabpanel-${index}`}
      aria-labelledby={`scrollable-auto-tab-${index}`}
    >
      <Box p={3}>{children}</Box>
    </Typography>
  );
}

function App() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('alignment-editor')

  const [alignedPerformance, setAlignedPerformance] = useState(new AlignedPerformance())
  const [alignmentReady, setAlignmentReady] = useState<number>(0)

  const closeUploadDialog = () => setUploadDialogOpen(false)
  const openUploadDialog = () => setUploadDialogOpen(true)

  const triggerUpdate = () => setAlignmentReady(alignmentReady+1)

  const actions = [
    { icon: <SaveIcon />, name: 'Save' },
    { icon: <AddIcon />, name: 'Choose Interpretation', action: openUploadDialog },
  ];

  return (
    <div className="App">
      <GlobalContext.Provider value={{
        alignedPerformance, 
        alignmentReady,
        triggerUpdate
      }}>
        <Tabs value={activeTab} onChange={(e, nv) => setActiveTab(nv)} aria-label="main tabs">
          <Tab value='alignment-editor' label="Alignment Editor" />
          <Tab value='interpolation-editor' label="Interpolation Editor"/>
          <Tab value='annotated-score' label="Annotated Score"/>
        </Tabs>
        <TabPanel value={activeTab} index='alignment-editor'>
          <AlignmentEditor />
        </TabPanel>
        <TabPanel value={activeTab} index='interpolation-editor'>
          <InterpolationEditor/>
        </TabPanel>
        <TabPanel value={activeTab} index='annotated-score'>
          <AnnotatedScore/>
        </TabPanel>

        <SpeedDial  
          ariaLabel="modify workspace"  
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.action}
            />
          ))}
        </SpeedDial>

        <Upload
          open={uploadDialogOpen}
          onClose={closeUploadDialog}
          setScore={(newScore) => {
            alignedPerformance.setScore(newScore)
            triggerUpdate()
          }}
          setPerformance={(newPerformance) => {
            alignedPerformance.setPerformance(newPerformance)
            triggerUpdate()
          }} />
      </GlobalContext.Provider>
    </div>
  );
}

export default App;
