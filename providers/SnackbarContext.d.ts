interface SnackbarContextProps {
    setMessage: (message?: string) => void;
}
export declare const SnackbarContext: import('react').Context<SnackbarContextProps>;
export declare const useSnackbar: () => SnackbarContextProps;
export {};
