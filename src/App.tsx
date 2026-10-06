import { useEffect, useState } from 'react';
import './App.css';
import { Snackbar } from '@mui/material';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

import { SnackbarContext } from './desk/SnackbarContext';
import { Desk } from './desk/RollDesk';
import { PianoContextProvider } from 'react-pianosound';
import { EditionProvider } from './edition/EditionContext';
import { Edition } from 'linked-rolls';
import { checkedDocument, importedEdition } from './edition/importEdition';
import { entityOfPath } from './edition/addresses';
import { blobIdOf, publishedEdition, PublicationContext, ReadPublication } from './edition/publication';

/**
 * The published edition, opened on whatever entity the address names:
 * the path of an entity's IRI, its id, shows that entity, and the bare
 * `/` the edition's title page.
 */
const PublishedDesk = () => {
  const { pathname } = useLocation()
  return <Desk show={entityOfPath(pathname)} />
}

const App = () => {
  const [message, setMessage] = useState<string>();
  const [existingEdition, setExistingEdition] = useState<Edition>();
  const [publication, setPublication] = useState<ReadPublication>();
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

  // The edition is published by the welte225.org repository; this is its only copy.
  useEffect(() => {
    const loadEdition = async () => {
      try {
        const res = await fetch(publishedEdition.url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        // The bytes as they came, so that a citation can name the commit holding them.
        const bytes = new Uint8Array(await res.arrayBuffer());

        // Read as an opened file is: brought up to the current format and
        // held against the schema, rather than believed as it arrives.
        const { document, errors } = await checkedDocument(JSON.parse(new TextDecoder().decode(bytes)));
        if (errors.length > 0) {
          console.warn('The published edition does not satisfy the schema:', errors);
        }

        const reading = importedEdition(document);
        if ('refusal' in reading) {
          throw new Error(reading.refusal);
        }

        setExistingEdition(reading.value);
        setPublication({ ...publishedEdition, blob: await blobIdOf(bytes).catch(() => undefined) });
      } catch (err) {
        console.error(err);
        setMessage('Could not load the edition of WM 225.');
      } finally {
        setIsLoadingEdition(false);
      }
    };

    void loadEdition();
  }, []);

  return (
    <div className="App">
      <SnackbarContext.Provider value={{ setMessage }}>
        <PianoContextProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/editor"
                element={
                  <EditionProvider>
                    <Desk />
                  </EditionProvider>
                }
              />

              {/*
                One route for the published edition and every entity of it,
                so that going from the roll to an entity, or from one entity
                to the next, leaves the desk standing instead of building it
                anew.
              */}
              <Route
                path="*"
                element={
                  isLoadingEdition ? (
                    <div role='status'>Loading…</div>
                  ) : (
                    <PublicationContext.Provider value={publication}>
                      <EditionProvider edition={existingEdition}>
                        <PublishedDesk />
                      </EditionProvider>
                    </PublicationContext.Provider>
                  )
                }
              />
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
