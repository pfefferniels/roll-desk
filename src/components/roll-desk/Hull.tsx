import React, { ReactNode, MouseEventHandler, useState } from "react";
import { roundedHull } from "../../helpers/roundedHull";
import { Box, cornersOf } from "../../helpers/drawing";
import { Svg, svg } from "../../helpers/units";
import { Glow, glowRings, settling } from "../../helpers/glow";

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
    /** The halo drawn around the shape, none by default. */
    glow?: Glow;
    /** How plainly the outline is drawn, fully by default. */
    outline?: number;
}

export const Hull = ({ ref, id, hull, onClick, label, soft, fill, fillOpacity, glow, outline = 1 }: HullProps) => {
    const [hovered, setHovered] = useState(false);

    return (
        <>
            {/* Outside the group that carries the id, so that it is drawn
                under the shape and nothing looks for the entity in it. */}
            {glow && glow.reach > 0 && glowRings.map(({ spread, opacity }) => (
                <path
                    key={spread}
                    className='decoration'
                    d={hull}
                    fill='none'
                    stroke={glow.colour}
                    strokeWidth={glow.reach * 2 * spread}
                    strokeOpacity={opacity}
                    strokeLinejoin='round'
                    style={{ pointerEvents: 'none', transition: settling }}
                />
            ))}

            <g
                className='hull'
                onClick={onClick}
                data-id={id}
            >
                <path
                    ref={ref}
                    id={id}
                    stroke={soft ? 'none' : 'black'}
                    strokeOpacity={outline}
                    fill={fill || (soft ? 'gray' : 'white')}
                    fillOpacity={(fillOpacity || (soft ? 0.2 : 0.8)) + (hovered ? 0.1 : 0)}
                    strokeWidth={1}
                    d={hull}
                    style={{ transition: settling }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                />
                <g>
                    {label}
                </g>
            </g>
        </>
    );
};
