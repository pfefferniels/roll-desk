import { ReactNode, MouseEventHandler } from 'react';
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 *
 * @param ids SVG must contain elements with matching data-id attributes
 * @param svg SVG to search for elements in
 * @returns points and hull of the convex hull of the elements
 */
export declare const getHull: (bboxes: Rect[], hullPadding?: number) => {
    points: [number, number][];
    hull: string;
};
interface HullProps {
    id: string;
    hull: string;
    label?: ReactNode;
    onClick: MouseEventHandler;
    soft?: boolean;
    fillOpacity?: number;
    fill?: string;
}
export declare const Hull: ({ id, hull, onClick, label, soft, fill, fillOpacity }: HullProps) => JSX.Element;
export {};
