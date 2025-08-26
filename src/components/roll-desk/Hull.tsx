import React, { ReactNode, MouseEventHandler, useState } from "react";
import { roundedHull } from "../../helpers/roundedHull";

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
export const getHull = (bboxes: Rect[], hullPadding = 3) => {
    const points =
        bboxes.map(bbox => {
            return [
                [bbox.x, bbox.y] as [number, number],
                [bbox.x + bbox.width, bbox.y] as [number, number],
                [bbox.x, bbox.y + bbox.height] as [number, number],
                [bbox.x + bbox.width, bbox.y + bbox.height] as [number, number]
            ];
        })
            .flat();
    const hull = roundedHull(points, hullPadding);
    return { points, hull };
};



interface HullProps {
    ref?: React.Ref<SVGPathElement>;
    id: string;
    hull: string;
    label?: ReactNode;
    onClick: MouseEventHandler;
    soft?: boolean;
    fillOpacity?: number;
    fill?: string;
}

export const Hull = ({ ref, id, hull, onClick, label, soft, fill, fillOpacity }: HullProps) => {
    const [hovered, setHovered] = useState(false);

    return (
        <g
            className='hull'
            onClick={onClick}
            data-id={id}
        >
            <path
                ref={ref}
                id={id}
                stroke={soft ? 'none' : 'black'}
                fill={fill || (soft ? 'gray' : 'white')}
                fillOpacity={(fillOpacity || (soft ? 0.2 : 0.8)) + (hovered ? 0.1 : 0)}
                strokeWidth={1}
                d={hull}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            />
            <g style={{
            }}>
                {label}
            </g>
        </g>
    );
};
