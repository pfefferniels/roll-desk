import { MouseEventHandler, SVGProps, useState } from "react";
import { arrowLine, Boxed, headPoints } from "../../helpers/arrow";
import { Glow, glowRings, settling } from "../../helpers/glow";

type ArrowProps = {
    /** Where the arrow comes from, and the place it points at. */
    from: Boxed
    to: Boxed
    /** The halo drawn along the line, none by default. */
    glow?: Glow
    /** How plainly the line itself is drawn, fully by default. */
    outline?: number
    onClick?: MouseEventHandler
    svgProps?: SVGProps<SVGPathElement>
}

/**
 * An arrow from one place on the roll to another, saying that the first
 * became the second. Its line is worked out in `helpers/arrow`, which
 * holds up wherever the two ends fall.
 */
export const Arrow = ({ from, to, glow, outline = 1, onClick, svgProps }: ArrowProps) => {
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
            {glow && glow.reach > 0 && glowRings.map(({ spread, opacity }) => (
                <path
                    key={spread}
                    className='decoration'
                    d={d}
                    fill='none'
                    stroke={glow.colour}
                    strokeWidth={glow.reach * 2 * spread}
                    strokeOpacity={opacity}
                    strokeLinecap='round'
                    style={{ pointerEvents: 'none', transition: settling }}
                />
            ))}

            {/* A line a millimetre wide is hard to hit, so a wider one takes the pointer. */}
            <path className='decoration' d={d} stroke='transparent' strokeWidth={10} fill='none' />

            <g opacity={outline} style={{ transition: settling }}>
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
        </g>
    )
}
