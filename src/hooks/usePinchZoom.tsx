import React, { createContext, useContext, ReactNode, Dispatch, SetStateAction, useMemo } from 'react';
import { RollGeometry, rollGeometry } from '../helpers/rollGeometry';

export interface PinchZoomContextProps extends RollGeometry {
    translateX: (x: number) => number

    trackHeight: {
        note: number
        expression: number
    }
    zoom: number
    setZoom: Dispatch<SetStateAction<number>>
}

const emptyGeometry = rollGeometry({ note: 0, expression: 0 }, 0)

const PinchZoomContext = createContext<PinchZoomContextProps>({
    ...emptyGeometry,
    trackHeight: { note: 0, expression: 0 },
    translateX: (x: number) => x,
    zoom: 0,
    setZoom: () => { }
});

interface PinchZoomProviderProps {
    spacing?: number
    zoom: number
    noteHeight: number
    expressionHeight: number
    setZoom: Dispatch<SetStateAction<number>>
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({
    zoom,
    noteHeight,
    expressionHeight,
    children,
    spacing = 40,
    setZoom
}) => {
    const trackHeight = useMemo(
        () => ({ note: noteHeight, expression: expressionHeight }),
        [noteHeight, expressionHeight]
    )

    const geometry = useMemo(
        () => rollGeometry(trackHeight, spacing),
        [trackHeight, spacing]
    )

    return (
        <PinchZoomContext.Provider value={{
            ...geometry,
            trackHeight,
            translateX: (x: number) => zoom * x,
            zoom,
            setZoom
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
