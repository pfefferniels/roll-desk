import { useMemo } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { useVisibleSpan } from "../../hooks/useVisibleSpan"
import { LabelledTick, ruler } from "../../helpers/scale"

/** Where the scale's baseline runs, in the clear above the tracker bar. */
export const rulerBaseline = -40

const look = { stroke: '#9ca3af', strokeWidth: 0.5 }

const labelledTick = 7
const plainTick = 3

const Reading = ({ at, label }: LabelledTick) => {
    const { translateX } = usePinchZoom()

    const x = translateX(at)

    return (
        <>
            <line x1={x} y1={rulerBaseline} x2={x} y2={rulerBaseline + labelledTick} {...look} />
            <text
                x={x}
                y={rulerBaseline - 4}
                fontSize={8}
                fill={look.stroke}
                textAnchor={at === 0 ? 'start' : 'middle'}
            >
                {label}
            </text>
        </>
    )
}

/**
 * A scale along the roll, stepping as finely as the zoom allows. Its ticks
 * are cut to the stretch on screen, so that their number follows the
 * viewport rather than the length of the roll.
 */
export const Ruler = () => {
    const { translateX, rollLength, zoom } = usePinchZoom()
    const over = useVisibleSpan()

    const { labelled, plain } = useMemo(
        () => ruler({ length: rollLength, zoom, over }),
        [rollLength, zoom, over]
    )

    return (
        <g className='ruler' pointerEvents='none'>
            <line
                x1={0}
                y1={rulerBaseline}
                x2={translateX(rollLength)}
                y2={rulerBaseline}
                {...look}
            />

            {plain.map(at => (
                <line
                    key={`plain_${at}`}
                    x1={translateX(at)}
                    y1={rulerBaseline}
                    x2={translateX(at)}
                    y2={rulerBaseline + plainTick}
                    {...look}
                />
            ))}

            {labelled.map(tick => (
                <Reading key={`reading_${tick.at}`} {...tick} />
            ))}
        </g>
    )
}
