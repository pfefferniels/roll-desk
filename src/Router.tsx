import React from 'react';
import { Route, BrowserRouter, Routes } from 'react-router-dom';
import WorksOverview from './components/works/WorksOverview';
import Work from './components/works/Work';
import MidiEditor from './components/midi-ld/MidiEditor';
import ScoreEditor from './components/ScoreEditor';
import MpmEditor from './components/MpmEditor';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/works" element={<WorksOverview />} />
        <Route path="/work/:workId" element={<Work />} />
        <Route path="/midi/:midiId" element={<MidiEditor />} />
        <Route path="/midi/:midiId/note/:noteId" element={<MidiEditor />} />
        <Route path="/score/:scoreId" element={<ScoreEditor />} />
        <Route path="/mpm/:mpmId" element={<MpmEditor />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
