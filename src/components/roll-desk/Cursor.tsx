import { Millimeters } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { rulerBaseline } from "./Ruler"

interface CursorProps {
    /** Where the pointer sits on the roll. */
    at: Millimeters
}

/** The reading the pointer stands at, drawn for as long as a drag runs. */
export const Cursor = ({ at }: CursorProps) => {
    const { translateX, height } = usePinchZoom()

    const x = translateX(at)

    return (
        <g className='cursor' pointerEvents='none'>
            <line
                x1={x}
                y1={rulerBaseline}
                x2={x}
                y2={height}
                strokeWidth={2}
                stroke='black'
            />

            <text
                x={x}
                y={10}
                fontSize={12}
                textAnchor='start'
                fill='black'
            >
                {`${(at / 10).toFixed(2)} cm`}
            </text>
        </g>
    )
}
