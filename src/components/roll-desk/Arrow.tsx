import { MouseEventHandler, SVGProps, useState } from "react";
import { arrowLine, headPoints, Point } from "../../helpers/arrow";

type ArrowProps = {
    /** Where the arrow comes from, and the place it points at. */
    from: Point
    to: Point
    onClick?: MouseEventHandler
    svgProps?: SVGProps<SVGPathElement>
}

/**
 * An arrow from one place on the roll to another, saying that the first
 * became the second. Its line is worked out in `helpers/arrow`, which
 * holds up wherever the two ends fall.
 */
export const Arrow = ({ from, to, onClick, svgProps }: ArrowProps) => {
    const [hover, setHover] = useState(false);

    const { d, head, angle } = arrowLine(from, to)

    return (
        <g
            className='arrow'
            onClick={e => onClick?.(e)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ cursor: onClick ? 'pointer' : 'auto' }}
        >
            {/* A line a millimetre wide is hard to hit, so a wider one takes the pointer. */}
            <path d={d} stroke='transparent' strokeWidth={10} fill='none' />

            <path
                stroke='black'
                strokeWidth={hover ? 2.5 : 1.5}
                fill='none'
                d={d}
                {...svgProps}
            />

            <polygon
                points={headPoints()}
                transform={`translate(${head.x} ${head.y}) rotate(${angle})`}
                fill='black'
                stroke='black'
                strokeWidth={hover ? 1 : 0}
            />
        </g>
    )
}
