import { Emulation } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom"

interface DynamicsProps {
    forEmulation: Emulation
}

export const Dynamics = ({ forEmulation: emulation }: DynamicsProps) => {
    const { pinch, zoom } = usePinchZoom()

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
                            fill='red'
                            cx={emulation.timeToPlace(i / 1000)! / zoom + pinch}
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
                            fill='red'
                            cx={emulation.timeToPlace(i / 1000)! / zoom + pinch}
                            r={1} />
                    )
                })}
            </g>
        </>
    )
}