import { default as React, ReactNode } from 'react';
export interface PinchZoomContextProps {
    translateX: (x: number) => number;
    trackToY: (y: number) => number;
    yToTrack: (y: number) => number | 'gap';
    trackHeight: {
        note: number;
        expression: number;
    };
    zoom: number;
    height: number;
}
interface PinchZoomProviderProps {
    spacing?: number;
    zoom: number;
    noteHeight: number;
    expressionHeight: number;
    children: ReactNode;
}
export declare const PinchZoomProvider: React.FC<PinchZoomProviderProps>;
export declare const usePinchZoom: () => PinchZoomContextProps;
export {};
