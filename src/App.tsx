import React, { } from 'react';
import './App.css';
import AppRouter from './Router';
import { SessionProvider } from '@inrupt/solid-ui-react';
import { LoginForm } from './components/login/Login';

const App: React.FC = () => {
  return (
    <div className="App">
      <SessionProvider sessionId="early-records">
        <LoginForm />

        <AppRouter />
      </SessionProvider>
    </div>
  );
};

export default App;
