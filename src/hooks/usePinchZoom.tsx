import React, { createContext, useContext, ReactNode } from 'react';

interface PinchZoomContextProps {
    translateX: (x: number) => number
    trackToY: (y: number) => number
    yToTrack: (y: number) => number | 'gap'

    trackHeight: {
        note: number
        expression: number
    }
    zoom: number
}

const PinchZoomContext = createContext<PinchZoomContextProps>({
    trackHeight: { note: 0, expression: 0 },
    translateX: (x: number) => x,
    trackToY: (track: number) => track,
    yToTrack: (y: number) => y,
    zoom: 0
});

interface PinchZoomProviderProps {
    spacing?: number
    zoom: number
    noteHeight: number
    expressionHeight: number
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({ zoom, noteHeight, expressionHeight, children, spacing: userSpacing }) => {
    const spacing = userSpacing || 40

    const translateX = (x: number) => {
        return zoom * x
    }

    const trackToY = (track: number) => {
        const inverse = 99 - track
        const spacing = 40
        if (inverse >= 90) {
            return spacing * 2 + 10 * expressionHeight + 80 * noteHeight + (inverse - 90) * expressionHeight
        }
        if (inverse >= 10) {
            return spacing + 10 * expressionHeight + (inverse - 10) * noteHeight
        }
        return inverse * expressionHeight
    }

    const yToTrack = (y: number): number | 'gap' => {
        const spacing = 40

        const seg1Max = 10 * expressionHeight
        const seg2Min = spacing + 10 * expressionHeight
        const seg2Max = spacing + 10 * expressionHeight + 80 * noteHeight
        const seg3Min = spacing * 2 + 10 * expressionHeight + 80 * noteHeight

        let inverse: number

        if (y < seg1Max) {
            inverse = y / expressionHeight
        } else if (y >= seg2Min && y < seg2Max) {
            inverse = ((y - seg2Min) / noteHeight) + 10
        } else if (y >= seg3Min) {
            inverse = ((y - seg3Min) / expressionHeight) + 90
        } else {
            return 'gap'
        }

        return 99 - inverse
    }

    return (
        <PinchZoomContext.Provider value={{
            translateX,
            trackToY,
            yToTrack,
            zoom,
            trackHeight: {
                note: noteHeight,
                expression: expressionHeight
            }
        }}>
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
