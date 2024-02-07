import React, { useState } from 'react';
import './App.css';
import AppRouter from './Router';
import { SessionProvider } from '@inrupt/solid-ui-react';
import { LoginForm } from './components/login/Login';
import { Snackbar } from '@mui/material';
import { SnackbarContext } from './providers/SnackbarContext';

const App = () => {
  const [message, setMessage] = useState<string>()

  return (
    <div className="App">
      <SessionProvider sessionId="early-records">
        <LoginForm />

        <SnackbarContext.Provider value={{ setMessage }}>
          <AppRouter />
        </SnackbarContext.Provider>
      </SessionProvider>

      <Snackbar
        message={message}
        open={!!message}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }} />
    </div>
  );
};

export default App;
