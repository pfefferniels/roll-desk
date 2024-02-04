import React from 'react';
import { Route, BrowserRouter, Routes, useParams, useSearchParams } from 'react-router-dom';
import WorksOverview from './components/works/WorksOverview';
import { datasetUrl } from './helpers/datasetUrl';
// import { AlignmentEditor } from './components/alignment/AlignmentEditor2';
// import { Interpretation } from './components/interpretation/Interpretation';
import { Desk } from './components/roll-desk/RollDesk';
import { PianoContextProvider } from './hooks/usePiano';

const ErrorBoundary = () => {
  return (
    <div>
      Something went wrong
    </div>
  )
}

const AlignmentRoute = () => {
  const { interpretationId } = useParams()
  const [search] = useSearchParams()

  const url =
    interpretationId
      ? `${datasetUrl}/works.ttl#${interpretationId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return null // <AlignmentEditor interpretationUrl={url} />
}

const InterpretationRoute = () => {
  const { interpretationId } = useParams()
  const [search] = useSearchParams()

  const url =
    interpretationId
      ? `${datasetUrl}/works.ttl#${interpretationId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return null // <Interpretation interpretationUrl={url} />
}

const RollRoute = () => {
  const { rollId } = useParams()
  const [search] = useSearchParams()

  const url =
    rollId
      ? `${datasetUrl}/works.ttl${rollId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return (
    <PianoContextProvider>
      <Desk url={url} />
    </PianoContextProvider>
  )
}

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorksOverview />} />
        <Route
          path="/align/:interpretationId?"
          element={<AlignmentRoute />}
          errorElement={<ErrorBoundary />}
        />
        <Route
          path="/interpretation/:interpretationId?"
          element={<InterpretationRoute />}
          errorElement={<ErrorBoundary />}
        />
        <Route
          path="/roll/:rollId?"
          element={<RollRoute />}
          errorElement={<ErrorBoundary />}
        />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
