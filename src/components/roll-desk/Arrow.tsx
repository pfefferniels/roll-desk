import { ArrowOptions, getBoxToBoxArrow } from "curved-arrows"
import { MouseEventHandler, SVGProps, useState } from "react";

type BBox = {
    x: number;
    y: number;
    width: number;
    height: number;
}

type ArrowProps = {
    from: BBox,
    to: BBox
} & ArrowOptions & {
    arrowHeadSize?: number;
    onClick?: MouseEventHandler;
} & {
    svgProps: SVGProps<SVGPathElement>
}

export const Arrow = ({ from, to, arrowHeadSize: headSize, onClick, svgProps, ...options }: ArrowProps) => {
    const [hover, setHover] = useState(false);

    const arrowHeadSize = headSize || 2;

    // do not draw any hull, only the arrow
    const [sx, sy, c1x, c1y, c2x, c2y, ex, ey, ae] = getBoxToBoxArrow(
        from.x,
        from.y,
        from.width,
        from.height,
        to.x,
        to.y,
        to.width,
        to.height,
        {
            controlPointStretch: options.controlPointStretch ||
                Math.max(Math.abs(from.x - to.x) * 0.5),
            padStart: options.padStart || 0,
            padEnd: options.padEnd || arrowHeadSize,
            allowedStartSides: options.allowedEndSides || ['bottom'],
            allowedEndSides: options.allowedEndSides || ['bottom']
        }
    )

    const arrowPath = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;
    const arrowHead = (
        <polygon
            points={`0,${-arrowHeadSize} ${arrowHeadSize * 2},0, 0,${arrowHeadSize}`}
            transform={`translate(${ex}, ${ey}) rotate(${ae})`}
            fill='black'
        />
    )
    return (
        <g
            className='arrow'
            onClick={(e) => {
                onClick && onClick(e)
            }}
        >
            <path
                stroke="black"
                strokeWidth={hover ? 2.5 : 1.5}
                fill="none"
                d={arrowPath}
                {...svgProps}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            />
            {arrowHead}
        </g>
    )
}