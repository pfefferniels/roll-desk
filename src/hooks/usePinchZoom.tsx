import React, { createContext, useContext, ReactNode } from 'react';

export interface PinchZoomContextProps {
    translateX: (x: number) => number
    trackToY: (y: number) => number
    yToTrack: (y: number) => number | 'gap'

    trackHeight: {
        note: number
        expression: number
    }
    zoom: number
    height: number
}

const PinchZoomContext = createContext<PinchZoomContextProps>({
    trackHeight: { note: 0, expression: 0 },
    translateX: (x: number) => x,
    trackToY: (track: number) => track,
    yToTrack: (y: number) => y,
    zoom: 0,
    height: 0
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

    const areas = {
        'bass-expression': [0, 9],
        'notes': [10, 89],
        'treble-expression': [90, 99]
    }

    const areaOf = (track: number) => {
        const area = Object
            .entries(areas)
            .find(([_, range]) => track >= range[0] && track <= range[1])
        if (!area) {
            return null
        }
        return area[0]
    }

    const translateX = (x: number) => {
        // Add validation and precision handling for complex notation
        if (!isFinite(x) || isNaN(x)) {
            console.warn('Invalid x coordinate detected:', x);
            return 0;
        }
        return Math.round(zoom * x * 1000) / 1000; // Round to 3 decimal places for precision
    }

    const height = 20 * expressionHeight + 80 * noteHeight + 2 * spacing

    const trackToY = (track: number) => {
        // Add validation for track parameter
        if (!isFinite(track) || isNaN(track)) {
            console.warn('Invalid track number detected:', track);
            return 0;
        }
        
        const name = areaOf(track)
        if (name === null) {
            console.warn('Track not in valid area:', track);
            return 0;
        }

        let result: number;
        
        if (name === 'bass-expression') {
            result = height - (track * expressionHeight);
        }
        else if (name === 'notes') {
            const noteArea = track - 10;
            result = height - (spacing + 10 * expressionHeight + noteArea * noteHeight);
        }
        else if (name === 'treble-expression') {
            const expressionArea = track - 90;
            result = height - (spacing * 2 + 10 * expressionHeight + 80 * noteHeight + expressionArea * expressionHeight);
        }
        else {
            result = 0;
        }
        
        // Ensure result is finite and round for precision
        if (!isFinite(result) || isNaN(result)) {
            console.warn('Invalid trackToY result for track', track, ':', result);
            return 0;
        }
        
        return Math.round(result * 1000) / 1000; // Round to 3 decimal places for precision
    }

    const yToTrack = (y: number): number | 'gap' => {
        // Add validation for y parameter
        if (!isFinite(y) || isNaN(y)) {
            console.warn('Invalid y coordinate detected:', y);
            return 'gap';
        }
        
        const inverse = height - y;
        
        // Remove debug console.log for cleaner output
        // console.log('y to track', 'inverse', inverse, 'height', height, 'y', y)

        const seg1Max = 10 * expressionHeight;
        const seg2Min = spacing + 10 * expressionHeight;
        const seg2Max = spacing + 10 * expressionHeight + 80 * noteHeight;
        const seg3Min = spacing * 2 + 10 * expressionHeight + 80 * noteHeight;

        let result: number | 'gap';

        if (inverse < 0) {
            // Handle negative inverse values
            result = 'gap';
        }
        else if (inverse < seg1Max) {
            result = Math.floor(inverse / expressionHeight);
        }
        else if (inverse >= seg2Min && inverse < seg2Max) {
            result = Math.floor((inverse - seg2Min) / noteHeight) + 10;
        }
        else if (inverse >= seg3Min) {
            result = Math.floor((inverse - seg3Min) / expressionHeight) + 90;
        }
        else {
            result = 'gap';
        }

        // Validate track range
        if (typeof result === 'number' && (result < 0 || result > 99)) {
            console.warn('Track out of valid range (0-99):', result);
            return 'gap';
        }

        return result;
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
            },
            height
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
