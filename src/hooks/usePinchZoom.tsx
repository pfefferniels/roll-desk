// PinchZoomContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';

interface PinchZoomContextProps {
    translateX: (x: number) => number 
    translateY: (y: number) => number

    trackHeight: number
    pinch: number 
    zoom: number
}

const PinchZoomContext = createContext<PinchZoomContextProps | undefined>(undefined);

interface PinchZoomProviderProps {
    pinch: number
    zoom: number
    trackHeight: number
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({ pinch, zoom, trackHeight, children }) => {
    const translateX = (x: number) => {
        return zoom * x + pinch
    }

    const translateY = (y: number) => {
        return trackHeight * y
    }

    return (
        <PinchZoomContext.Provider value={{ translateX, translateY, pinch, zoom, trackHeight }}>
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
