import { useEffect, useState } from 'react';
import './App.css';
import { Snackbar } from '@mui/material';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';

import { SnackbarContext } from './providers/SnackbarContext';
import { Desk } from './components/roll-desk/RollDesk';
import { PianoContextProvider } from 'react-pianosound';
import { EditionProvider } from './providers/EditionContext';
import { Edition, importJsonLd } from 'linked-rolls';

/**
 * The desk opened on one entity of the edition, so that the path of an
 * entity's IRI, `/symbol_…` or `/copy/…`, shows that entity.
 */
const DeskShowing = () => {
  const { entityId } = useParams()
  return <Desk show={entityId} />
}

const App = () => {
  const [message, setMessage] = useState<string>();
  const [existingEdition, setExistingEdition] = useState<Edition>();
  const [isLoadingEdition, setIsLoadingEdition] = useState<boolean>(true);

  // warn before leaving page
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  // The edition lives in the wm225.org repository, which publishes it as
  // https://wm225.org/edition.jsonld; that address replaces the raw one
  // once the domain resolves.
  useEffect(() => {
    const loadEdition = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/pfefferniels/wm225.org/main/edition.jsonld');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const edition = importJsonLd(json);
        setExistingEdition(edition);
      } catch (err) {
        console.error(err);
        setMessage('Could not load the edition of WM 225.');
      } finally {
        setIsLoadingEdition(false);
      }
    };

    loadEdition();
  }, []);

  return (
    <div className="App">
      <SnackbarContext.Provider value={{ setMessage }}>
        <PianoContextProvider>
          <BrowserRouter>
            <Routes>
              {/* default route: load existing edition */}
              <Route
                path="/"
                element={
                  isLoadingEdition ? (
                    <div>Loading…</div>
                  ) : (
                    <EditionProvider edition={existingEdition}>
                      <Desk />
                    </EditionProvider>
                  )
                }
              />

              <Route
                path="/editor"
                element={
                  <EditionProvider>
                    <Desk />
                  </EditionProvider>
                }
              />

              {/* an entity of the existing edition, by the path of its IRI */}
              {['/copy/:entityId', '/:entityId'].map(path => (
                <Route
                  key={path}
                  path={path}
                  element={
                    isLoadingEdition ? (
                      <div>Loading…</div>
                    ) : (
                      <EditionProvider edition={existingEdition}>
                        <DeskShowing />
                      </EditionProvider>
                    )
                  }
                />
              ))}
            </Routes>
          </BrowserRouter>
        </PianoContextProvider>
      </SnackbarContext.Provider>

      <Snackbar
        message={message}
        open={!!message}
        onClose={() => setMessage(undefined)}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      />
    </div>
  );
};

export default App;
