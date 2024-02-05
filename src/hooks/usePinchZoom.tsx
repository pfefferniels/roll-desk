// PinchZoomContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';

interface PinchZoomContextProps {
    zoom: number;
    pinch: number;
}

const PinchZoomContext = createContext<PinchZoomContextProps | undefined>(undefined);

interface PinchZoomProviderProps {
    pinch: number
    zoom: number
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({ pinch, zoom, children }) => {
    return (
        <PinchZoomContext.Provider value={{ pinch, zoom }}>
            {children}
        </PinchZoomContext.Provider>
    );
};

export const usePinchZoom = () => {
    const context = useContext(PinchZoomContext);
    if (!context) {
        throw new Error('usePinchZoom must be used within a PinchZoomProvider');
    }
    return context;
};
