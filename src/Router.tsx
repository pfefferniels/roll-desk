import React from 'react';
import { Route, BrowserRouter, Routes, useParams, useSearchParams } from 'react-router-dom';
import WorksOverview from './components/works/WorksOverview';
import { datasetUrl } from './helpers/datasetUrl';
import { AlignmentEditor } from './components/alignment/AlignmentEditor';
import { MpmEditor } from './components/mpm/MpmEditor';
import { Work } from './components/work/Work';

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

  return <AlignmentEditor url={url} />
}

const InterpretationRoute = () => {
  const { interpretationId } = useParams()
  const [search] = useSearchParams()

  const url =
    interpretationId
      ? `${datasetUrl}/works.ttl#${interpretationId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return <MpmEditor url={url} />
}

const WorkRoute = () => {
  const { rollId } = useParams()
  const [search] = useSearchParams()

  const url =
    rollId
      ? `${datasetUrl}/works.ttl${rollId}`
      : search.get('url')
  if (!url) throw new Error('no proper URL passed')

  return <Work url={url} />
}

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/works" element={<WorksOverview />} />
        <Route
          path="/alignment/:interpretationId?"
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
          element={<WorkRoute />}
          errorElement={<ErrorBoundary />}
        />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
