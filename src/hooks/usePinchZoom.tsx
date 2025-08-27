import React, { createContext, useContext, ReactNode } from 'react';

export interface PinchZoomContextProps {
    translateX: (x: number) => number
    trackToY: (y: number) => number
    yToTrack: (y: number) => number | 'gap'
    getRepresentativeTrack: (area: 'bass-expression' | 'notes' | 'treble-expression') => number

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
    getRepresentativeTrack: (area: 'bass-expression' | 'notes' | 'treble-expression') => 0,
    zoom: 0,
    height: 0
});

interface RollSystemAreas {
    'bass-expression': [number, number]
    'notes': [number, number]
    'treble-expression': [number, number]
}

interface PinchZoomProviderProps {
    spacing?: number
    zoom: number
    noteHeight: number
    expressionHeight: number
    rollSystemAreas?: RollSystemAreas
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({ 
    zoom, 
    noteHeight, 
    expressionHeight, 
    children, 
    spacing: userSpacing,
    rollSystemAreas 
}) => {
    const spacing = userSpacing || 40

    // Default to Welte T-100 system if no areas specified
    const areas = rollSystemAreas || {
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
        return zoom * x
    }

    const height = 20 * expressionHeight + 80 * noteHeight + 2 * spacing

    const trackToY = (track: number) => {
        const name = areaOf(track)
        if (name === null) return 0

        if (name === 'bass-expression') {
            return height - (track * expressionHeight)
        }
        if (name === 'notes') {
            const noteArea = track - 10
            return height - (spacing + 10 * expressionHeight + noteArea * noteHeight)
        }
        if (name === 'treble-expression') {
            const expressionArea = track - 90
            return height - (spacing * 2 + 10 * expressionHeight + 80 * noteHeight + expressionArea * expressionHeight)
        }
        else {
            return 0
        }
    }

    const yToTrack = (y: number): number | 'gap' => {
        const inverse = height - y
        console.log('y to track', 'nverse', inverse, 'height', height, 'y', y)

        const seg1Max = 10 * expressionHeight
        const seg2Min = spacing + 10 * expressionHeight
        const seg2Max = spacing + 10 * expressionHeight + 80 * noteHeight
        const seg3Min = spacing * 2 + 10 * expressionHeight + 80 * noteHeight

        if (inverse < seg1Max) {
            return Math.floor(inverse / expressionHeight)
        }
        else if (inverse >= seg2Min && inverse < seg2Max) {
            return Math.floor((inverse - seg2Min) / noteHeight) + 10
        }
        else if (inverse >= seg3Min) {
            return Math.floor((inverse - seg3Min) / expressionHeight) + 90
        }

        return 'gap'
    }

    const getRepresentativeTrack = (area: 'bass-expression' | 'notes' | 'treble-expression'): number => {
        const range = areas[area]
        // Return the middle track of the range
        return Math.floor((range[0] + range[1]) / 2)
    }

    return (
        <PinchZoomContext.Provider value={{
            translateX,
            trackToY,
            yToTrack,
            getRepresentativeTrack,
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
