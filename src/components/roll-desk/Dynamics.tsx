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

    const translate = (x: number) =>
        translateX(x * (stretch?.factor || 1) + (shift?.horizontal || 0))

    const bassShift = 450
    const reducerFor = (scope: 'treble' | 'bass') => {
        return (acc: [number, number][], v: number, i: number) => {
            if (i % 20 !== 0) return acc
            const x = translate(emulation.placeTimeConversion.timeToPlace(i / 1000)! * 10)
            const y = 127 - v + (scope === 'bass' ? bassShift : 0)
            acc.push([x, y])
            return acc
        }
    }

    const treblePositions = emulation.trebleVelocities
        .reduce(reducerFor('treble'), [])

    const bassPositions = emulation.bassVelocities
        .reduce(reducerFor('bass'), [])

    const makePath = (pts: [number, number][]) => {
        if (pts.length === 0) return ""
        return pts
            .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
            .join(" ")
    }

    const trebleD = makePath(treblePositions)
    const bassD = makePath(bassPositions)

    return (
        <>
            <g className="trebleVelocities">
                <path
                    d={trebleD}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                />
            </g>
            <g className="bassVelocities">
                <path
                    d={bassD}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                />
            </g>
        </>
    )
}
