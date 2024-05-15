import { Emulation } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom"

interface DynamicsProps {
    forEmulation: Emulation
    color: string
}

export const Dynamics = ({ forEmulation: emulation, color }: DynamicsProps) => {
    const { translateX } = usePinchZoom()

    return (
        <>
            <g className='trebleVelocities'>
                {emulation.trebleVelocities.map((v, i) => {
                    if (i % 100 !== 0) return null
                    return (
                        <circle
                            key={`treble_${v}_${i}`}
                            className='velocity'
                            cy={127 - v}
                            fill={color}
                            cx={translateX(emulation.placeTimeConversion.timeToPlace(i / 100)!)}
                            r={1} />
                    )
                })}
            </g>

            <g className='bassVelocities'>
                {emulation.bassVelocities.map((v, i) => {
                    if (i % 100 !== 0) return null
                    return (
                        <circle
                            key={`bass_${v}_${i}`}
                            className='velocity'
                            cy={127 - v + 450}
                            fill={color}
                            cx={translateX(emulation.placeTimeConversion.timeToPlace(i / 100)!)}
                            r={1} />
                    )
                })}
            </g>
        </>
    )
}