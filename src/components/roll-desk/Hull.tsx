import React, { ReactNode, MouseEventHandler, useState } from "react";
import { roundedHull } from "../../helpers/roundedHull";
import { Box, cornersOf } from "../../helpers/drawing";
import { Svg, svg } from "../../helpers/units";

/**
 * 
 * @param ids SVG must contain elements with matching data-id attributes
 * @param svg SVG to search for elements in
 * @returns points and hull of the convex hull of the elements
 */
export const getHull = (boxes: Box[], hullPadding: Svg = svg(3)) => {
    const points = boxes.flatMap(cornersOf);
    return { points, hull: roundedHull(points, hullPadding) };
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
                onMouseEnter={() => {
                    console.log('entered', id)
                    setHovered(true)
                }}
                onMouseLeave={() => setHovered(false)}
            />
            <g style={{
            }}>
                {label}
            </g>
        </g>
    );
};
