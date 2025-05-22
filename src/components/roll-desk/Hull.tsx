import { ReactNode, MouseEventHandler, useState } from "react";

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
                strokeDasharray={soft ? 'none' : '5 1'}
                d={hull}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)} />
            <g style={{
                fillOpacity: hovered ? 1 : 0.5,
                strokeOpacity: hovered ? 1 : 0.5,
            }}>
                {label}
            </g>
        </g>
    );
};
