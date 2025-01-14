import { Emulation, Shift, Stretch } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"

interface DynamicsProps {
    forEmulation: Emulation
    color: string
    shift?: Shift
    stretch?: Stretch
}

export const Dynamics = ({ forEmulation: emulation, color, shift, stretch }: DynamicsProps) => {
    const { translateX } = usePinchZoom()

    const translate = (x: number) => {
        return translateX(x * (stretch?.factor || 1) + (shift?.horizontal || 0))
    }

    const treblePositions: [number, number][] = emulation.trebleVelocities
        .reduce((acc, v, i) => {
            if (i % 20 !== 0) return acc
            acc.push([translate(emulation.placeTimeConversion.timeToPlace(i / 1000)! * 10), 127 - v])
            return acc
        }, [] as [number, number][])

    const bassPositions: [number, number][] = emulation.bassVelocities
        .reduce((acc, v, i) => {
            if (i % 20 !== 0) return acc
            acc.push([translate(emulation.placeTimeConversion.timeToPlace(i / 1000)! * 10), 127 - v + 450])
            return acc
        }, [] as [number, number][])

    return (
        <>
            <g className='trebleVelocities'>
                {treblePositions.map(([x, y], i, arr) => {
                    if (i === arr.length - 1) return null
                    const [x2, y2] = arr[i + 1]

                    return (
                        <line
                            key={`treble_${x}_${y}`}
                            className='velocity'
                            fill={color}
                            x1={x}
                            y1={y}
                            x2={x2}
                            y2={y2}
                            strokeWidth={1}
                            stroke={color}
                        />
                    )
                })}
            </g>

            <g className='bassVelocities'>
                {bassPositions.map(([x, y], i, arr) => {
                    if (i === arr.length - 1) return null
                    const [x2, y2] = arr[i + 1]

                    return (
                        <line
                            key={`bass_${x}_${y}`}
                            className='velocity'
                            fill={color}
                            x1={x}
                            y1={y}
                            x2={x2}
                            y2={y2}
                            strokeWidth={1}
                            stroke={color}
                        />
                    )
                })}
            </g>
        </>
    )
}