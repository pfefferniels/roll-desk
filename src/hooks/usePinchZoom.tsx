import React, { createContext, useContext, ReactNode, useMemo, RefObject } from 'react';
import { Millimeters, mm, TrackerBar, welteT100 } from 'linked-rolls';
import { LaneHeights, RollGeometry, rollGeometry } from '../helpers/rollGeometry';
import { drawnAt, Svg, svg, SvgPerMm, svgPerMm } from '../helpers/units';

export interface PinchZoomContextProps extends RollGeometry {
    translateX: (x: Millimeters) => Svg

    /** How far the roll runs. */
    rollLength: Millimeters

    trackHeight: LaneHeights

    /** The gap left between the blocks of the bar, so a second bar can be laid out the same way. */
    spacing: Svg
    zoom: SvgPerMm
    setZoom: (zoom: SvgPerMm) => void

    /**
     * The element the roll is scrolled in, once it is in the document, and
     * whether a zoom gesture is running. Together they say which part of
     * the roll is on screen, see `useVisibleSpan`.
     */
    viewport: HTMLDivElement | null
    gesturing: RefObject<boolean>
}

const emptyGeometry = rollGeometry({ note: svg(0), expression: svg(0) }, svg(0), welteT100)

const atRest: RefObject<boolean> = { current: false }

const PinchZoomContext = createContext<PinchZoomContextProps>({
    ...emptyGeometry,
    trackHeight: { note: svg(0), expression: svg(0) },
    spacing: svg(0),
    translateX: () => svg(0),
    rollLength: mm(0),
    zoom: svgPerMm(0),
    setZoom: () => { },
    viewport: null,
    gesturing: atRest
});

interface PinchZoomProviderProps {
    /**
     * The bar the roll on the desk is read by: the current version's
     * system, or the current copy's. Everything drawn follows it, so a
     * green version is laid out in 98 lanes and a red one in 100.
     */
    bar: TrackerBar
    spacing?: Svg
    zoom: SvgPerMm
    rollLength: Millimeters
    noteHeight: Svg
    expressionHeight: Svg
    setZoom: (zoom: SvgPerMm) => void
    viewport?: HTMLDivElement | null
    gesturing?: RefObject<boolean>
    children: ReactNode;
}

export const PinchZoomProvider: React.FC<PinchZoomProviderProps> = ({
    bar,
    zoom,
    rollLength,
    noteHeight,
    expressionHeight,
    children,
    spacing = svg(40),
    setZoom,
    viewport = null,
    gesturing = atRest
}) => {
    const trackHeight = useMemo(
        () => ({ note: noteHeight, expression: expressionHeight }),
        [noteHeight, expressionHeight]
    )

    const geometry = useMemo(
        () => rollGeometry(trackHeight, spacing, bar),
        [trackHeight, spacing, bar]
    )

    const value = useMemo(() => ({
        ...geometry,
        trackHeight,
        spacing,
        translateX: (x: Millimeters) => drawnAt(x, zoom),
        rollLength,
        zoom,
        setZoom,
        viewport,
        gesturing
    }), [geometry, trackHeight, spacing, rollLength, zoom, setZoom, viewport, gesturing])

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
