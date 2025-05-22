import { ReactNode, MouseEventHandler, useState } from "react";
import { roundedHull } from "../../../helpers/roundedHull";

/**
 * 
 * @param ids SVG must contain elements with matching data-id attributes
 * @param svg SVG to search for elements in
 * @returns points and hull of the convex hull of the elements
 */
export const getHull = (ids: string[], svg: SVGGElement, hullPadding = 3) => {
    const points = ids
        .map(id => {
            return svg.querySelector(`[data-id="${id}"]`);
        })
        .filter(el => !!el)
        .map(el => {
            const bbox = (el as SVGGraphicsElement).getBBox();
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
    id: string;
    hull: string;
    label?: ReactNode;
    onClick: MouseEventHandler;
    soft?: boolean;
    fillOpacity?: number;
    fill?: string;
}
export const Hull = ({ id, hull, onClick, label, soft, fill, fillOpacity }: HullProps) => {
    const [hovered, setHovered] = useState(false);

    return (
        <g
            className='hull'
            onClick={onClick}
        >
            <path
                data-id={id}
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
                fillOpacity: hovered ? 1 : 0.5,
                strokeOpacity: hovered ? 1 : 0.5,
            }}>
                {label}
            </g>
        </g>
    );
};
