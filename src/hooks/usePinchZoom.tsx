import React, { createContext, useContext, ReactNode } from 'react';

interface PinchZoomContextProps {
    translateX: (x: number) => number
    trackToY: (y: number) => number

    trackHeight: {
        note: number
        expression: number
    }
    // pinch: number 
    zoom: number
}

const PinchZoomContext = createContext<PinchZoomContextProps>({
    trackHeight: { note: 0, expression: 0 },
    translateX: (x: number) => x,
    trackToY: (track: number) => track,
    zoom: 0
});

interface PinchZoomProviderProps {
    // pinch: number
    zoom: number
    noteHeight: number
    expressionHeight: number
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({ zoom, noteHeight, expressionHeight, children }) => {
    const translateX = (x: number) => {
        return zoom * x
    }

    const trackToY = (track: number) => {
        const inverse = 100 - track

        const spacing = 40

        if (inverse >= 90) {
            return spacing * 2 + 10 * expressionHeight + 80 * noteHeight + (inverse - 90) * expressionHeight
        }
        if (inverse >= 10) {
            return spacing + 10 * expressionHeight + (inverse - 10) * noteHeight
        }
        return inverse * expressionHeight
    }

    return (
        <PinchZoomContext.Provider value={{ translateX, trackToY, zoom, trackHeight: { note: noteHeight, expression: expressionHeight } }}>
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
