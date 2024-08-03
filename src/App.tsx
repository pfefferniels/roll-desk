import React, { useState } from 'react';
import './App.css';
import { Snackbar } from '@mui/material';
import { SnackbarContext } from './providers/SnackbarContext';
import { Desk } from './components/roll-desk/RollDesk';
import { PianoContextProvider } from 'react-pianosound';

const App = () => {
  const [message, setMessage] = useState<string>()

  return (
    <div className="App">
      <SnackbarContext.Provider value={{ setMessage }}>
        <PianoContextProvider>
          <Desk />
        </PianoContextProvider>
      </SnackbarContext.Provider>

      <Snackbar
        message={message}
        open={!!message}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }} />
    </div>
  );
};

export default App;
