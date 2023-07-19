import React from 'react';
import { Route, BrowserRouter, Routes, useParams, useSearchParams } from 'react-router-dom';
import WorksOverview from './components/works/WorksOverview';
import MidiViewer from './components/midi-ld/MidiViewer';
import { AnalysisEditor } from './components/analysis/AnalysisEditor';
import { datasetUrl } from './helpers/datasetUrl';
import { AlignmentEditor } from './components/alignment/AlignmentEditor';
import { MpmEditor } from './components/mpm/MpmEditor';

const ErrorBoundary = () => {
  return (
    <div>
      Something went wrong
    </div>
  )
}

const MidiViewerRoute = () => {
  const { midiId, noteId } = useParams()
  const [search] = useSearchParams()

  const url =
    midiId
      ? `${datasetUrl}/${midiId}.ttl#${noteId ? noteId : midiId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return <MidiViewer url={url} />
}

const AnalysisRoute = () => {
  const { analysisId } = useParams()
  const [search] = useSearchParams()

  const url =
    analysisId
      ? `${datasetUrl}/works.ttl#${analysisId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return <AnalysisEditor url={url} />
}

const AlignmentRoute = () => {
  const { alignmentId } = useParams()
  const [search] = useSearchParams()

  const url =
    alignmentId
      ? `${datasetUrl}/works.ttl#${alignmentId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return <AlignmentEditor url={url} />
}

const MpmRoute = () => {
  const { mpmId } = useParams()
  const [search] = useSearchParams()

  const url =
    mpmId
      ? `${datasetUrl}/works.ttl#${mpmId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return <MpmEditor url={url} />
}

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/works" element={<WorksOverview />} />
        <Route
          path="/midi/:midiId?/:noteId?"
          element={<MidiViewerRoute />}
          errorElement={<ErrorBoundary />}
        />
        <Route
          path="/analysis/:analysisId?"
          element={<AnalysisRoute />}
          errorElement={<ErrorBoundary />}
        />
        <Route
          path="/alignment/:alignmentId?"
          element={<AlignmentRoute />}
          errorElement={<ErrorBoundary />}
        />
        <Route
          path="/mpm/:mpmId?"
          element={<MpmRoute />}
          errorElement={<ErrorBoundary />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
