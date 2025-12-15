import { useEffect, useState } from 'react';
import './App.css';
import { Snackbar } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { SnackbarContext } from './providers/SnackbarContext';
import { Desk } from './components/roll-desk/RollDesk';
import { PianoContextProvider } from 'react-pianosound';
import { EditionProvider } from './providers/EditionContext';
import { Edition, importJsonLd } from 'linked-rolls';

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

  // load default edition from public/roll.json
  useEffect(() => {
    const loadEdition = async () => {
      try {
        const res = await fetch('/roll.json');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const edition = importJsonLd(json);
        setExistingEdition(edition);
      } catch (err) {
        console.error(err);
        setMessage('Could not load default edition (roll.json).');
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
