import { usePinchZoom } from "./usePinchZoom"

/**
 * The blocks of the bar, each drawn as a box under its lanes, so that
 * where either hand's expression ends and the keyboard begins is seen at
 * a glance, however tightly the keyboard is pressed together.
 */
export const Blocks = () => {
    const { areas, areaBand, translateX, rollLength } = usePinchZoom()

    return (
        <g className='blocks' pointerEvents='none'>
            {areas.map(area => (
                <rect
                    key={area.role}
                    x={0}
                    width={translateX(rollLength)}
                    {...areaBand(area)}
                    fill='#f7f7f5'
                    stroke='#d0d0d0'
                    strokeWidth={0.5}
                />
            ))}
        </g>
    )
}
