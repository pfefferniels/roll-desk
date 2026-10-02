import { usePinchZoom } from "./usePinchZoom"

/**
 * The blocks of the bar, each drawn as a box under its lanes, so that
 * where either hand's expression ends and the keyboard begins is seen at
 * a glance, however tightly the keyboard is pressed together. The keyboard
 * is left on the paper itself, its outline being enough to set it apart.
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
                    fill={area.role === 'note' ? 'none' : '#f7f7f5'}
                    stroke='#d0d0d0'
                    strokeWidth={0.5}
                />
            ))}
        </g>
    )
}
