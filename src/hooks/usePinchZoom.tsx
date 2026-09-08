import React, { createContext, useContext, ReactNode, useMemo, RefObject } from 'react';
import { RollGeometry, rollGeometry } from '../helpers/rollGeometry';

export interface PinchZoomContextProps extends RollGeometry {
    translateX: (x: number) => number

    /** How far the roll runs, in millimetres. */
    rollLength: number

    trackHeight: {
        note: number
        expression: number
    }
    zoom: number
    setZoom: (zoom: number) => void

    /**
     * The element the roll is scrolled in, once it is in the document, and
     * whether a zoom gesture is running. Together they say which part of
     * the roll is on screen, see `useVisibleSpan`.
     */
    viewport: HTMLDivElement | null
    gesturing: RefObject<boolean>
}

const emptyGeometry = rollGeometry({ note: 0, expression: 0 }, 0)

const atRest: RefObject<boolean> = { current: false }

const PinchZoomContext = createContext<PinchZoomContextProps>({
    ...emptyGeometry,
    trackHeight: { note: 0, expression: 0 },
    translateX: (x: number) => x,
    rollLength: 0,
    zoom: 0,
    setZoom: () => { },
    viewport: null,
    gesturing: atRest
});

interface PinchZoomProviderProps {
    spacing?: number
    zoom: number
    rollLength: number
    noteHeight: number
    expressionHeight: number
    setZoom: (zoom: number) => void
    viewport?: HTMLDivElement | null
    gesturing?: RefObject<boolean>
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({
    zoom,
    rollLength,
    noteHeight,
    expressionHeight,
    children,
    spacing = 40,
    setZoom,
    viewport = null,
    gesturing = atRest
}) => {
    const trackHeight = useMemo(
        () => ({ note: noteHeight, expression: expressionHeight }),
        [noteHeight, expressionHeight]
    )

    const geometry = useMemo(
        () => rollGeometry(trackHeight, spacing),
        [trackHeight, spacing]
    )

    const value = useMemo(() => ({
        ...geometry,
        trackHeight,
        translateX: (x: number) => zoom * x,
        rollLength,
        zoom,
        setZoom,
        viewport,
        gesturing
    }), [geometry, trackHeight, rollLength, zoom, setZoom, viewport, gesturing])

    return (
        <PinchZoomContext.Provider value={value}>
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
