import React, { ReactElement, useState } from 'react';
import './App.css';
import { Tab, Tabs, Typography } from '@mui/material';
import { Box } from '@mui/system';
import AlignmentEditor from './components/alignment/AlignmentEditor';
import InterpolationEditor from './components/interpolation/InterpolationEditor';
import AnnotationViewer from './components/annotation/AnnotationViewer';
import { AnnotationContext, MidiOutputProvider, RdfStoreContext } from './providers';
import { Store, graph } from 'rdflib'
import { AnnotatorButton } from './components/annotation/AnnotatorButton';
import { DatasetProvider, SessionProvider } from '@inrupt/solid-ui-react';
import { LoginForm } from './components/login';
import { NetworkOverview } from './components/network-overview';
import { FormalAlterationEditor } from './components/formal-alteration';

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

  const [rdfStore] = useState<Store>(graph())
  const [annotationTargets, setAnnotationTargets] = useState<string[]>([])

  return (
    <div className="App">
      <MidiOutputProvider>
        <SessionProvider sessionId="measuring-session">
          <RdfStoreContext.Provider value={rdfStore && {
            rdfStore: rdfStore
          }}>
            <AnnotationContext.Provider value={{ targets: annotationTargets, setTargets: setAnnotationTargets }}>
              <AnnotatorButton />

              <DatasetProvider datasetUrl="https://pfefferniels.inrupt.net/notes/test.ttl">
                <LoginForm />
                
                <Tabs value={activeTab} onChange={(e, nv) => setActiveTab(nv)} aria-label="main tabs">
                  <Tab value='network-overview' label="Overview" />
                  <Tab value='formal-alteration' label="Formal Alterations" />
                  <Tab value='alignment-editor' label="Alignment Editor" />
                  <Tab value='interpolation-editor' label="MPM Editor" />
                  <Tab value='annotated-score' label="Annotations" />
                </Tabs>

                <TabPanel value={activeTab} index='network-overview'>
                  <NetworkOverview />
                </TabPanel>
                <TabPanel value={activeTab} index='formal-alteration'>
                  <FormalAlterationEditor />
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
              </DatasetProvider>
            </AnnotationContext.Provider>
          </RdfStoreContext.Provider>
        </SessionProvider>
      </MidiOutputProvider>
    </div>
  );
}
