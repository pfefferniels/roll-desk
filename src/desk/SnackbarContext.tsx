import { createContext, useContext } from 'react';

interface SnackbarContextProps {
    setMessage: (message?: string) => void
}

export const SnackbarContext = createContext<SnackbarContextProps>({ setMessage: () => {}});

export const useSnackbar = () => useContext(SnackbarContext)
