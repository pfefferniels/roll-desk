// PinchZoomContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';

interface PinchZoomContextProps {
    zoom: number;
    pinch: number;
    trackHeight: number;
}

const PinchZoomContext = createContext<PinchZoomContextProps | undefined>(undefined);

interface PinchZoomProviderProps {
    pinch: number
    zoom: number
    trackHeight: number
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({ pinch, zoom, trackHeight, children }) => {
    return (
        <PinchZoomContext.Provider value={{ pinch, zoom, trackHeight }}>
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
