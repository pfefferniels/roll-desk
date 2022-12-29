import React, { ReactElement, useState } from 'react';
import './App.css';
import { SpeedDial, SpeedDialAction, SpeedDialIcon, Tab, Tabs, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/system';
import AlignmentEditor from './components/alignment/AlignmentEditor';
import InterpolationEditor from './components/interpolation/InterpolationEditor';
import AnnotationViewer from './components/annotation/AnnotationViewer';
import { AnnotationContext, GlobalContext, MidiOutputProvider, RdfStoreContext } from './providers';
import { AlignedPerformance } from './lib/AlignedPerformance';
import { Store, graph } from 'rdflib'
import { AnnotatorButton } from './components/annotation/AnnotatorButton';
import { SessionProvider } from '@inrupt/solid-ui-react';
import { LoginForm } from './components/login';
import { NetworkOverview } from './components/network-overview';

function TabPanel(props: { children: ReactElement, index: string, value: string }) {
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

export default function Editor() {
  const [activeTab, setActiveTab] = useState('network-overview')

  const [alignedPerformance] = useState(new AlignedPerformance())
  const [alignmentReady, setAlignmentReady] = useState<number>(0)

  const [rdfStore] = useState<Store>(graph())
  const [annotationTargets, setAnnotationTargets] = useState<string[]>([])

  const triggerUpdate = () => setAlignmentReady(alignmentReady + 1)

  return (
    <div className="App">
      <MidiOutputProvider>
        <SessionProvider sessionId="measuring-session">
          <RdfStoreContext.Provider value={rdfStore && {
            rdfStore: rdfStore
          }}>
            <AnnotationContext.Provider value={{ targets: annotationTargets, setTargets: setAnnotationTargets }}>
              <AnnotatorButton />

              <GlobalContext.Provider value={{
                alignedPerformance,
                alignmentReady,
                triggerUpdate
              }}>
                <LoginForm />
                
                <Tabs value={activeTab} onChange={(e, nv) => setActiveTab(nv)} aria-label="main tabs">
                  <Tab value='network-overview' label="Overview" />
                  <Tab value='alignment-editor' label="Alignment Editor" />
                  <Tab value='interpolation-editor' label="MPM Editor" />
                  <Tab value='annotated-score' label="Annotations" />
                </Tabs>
                
                <TabPanel value={activeTab} index='network-overview'>
                  <NetworkOverview />
                </TabPanel>
                <TabPanel value={activeTab} index='alignment-editor'>
                  <AlignmentEditor />
                </TabPanel>
                <TabPanel value={activeTab} index='interpolation-editor'>
                  <InterpolationEditor />
                </TabPanel>
                <TabPanel value={activeTab} index='annotated-score'>
                  <AnnotationViewer />
                </TabPanel>


              </GlobalContext.Provider>
            </AnnotationContext.Provider>
          </RdfStoreContext.Provider>
        </SessionProvider>
      </MidiOutputProvider>
    </div>
  );
}
