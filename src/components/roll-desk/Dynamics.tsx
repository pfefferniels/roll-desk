import { Emulation, Shift, Stretch } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"

type DynamicsProps ={
    forEmulation: Emulation
    shift?: Shift
    stretch?: Stretch
    pathProps: React.SVGProps<SVGPathElement>
} 

export const Dynamics = ({ forEmulation: emulation, shift, stretch, pathProps }: DynamicsProps) => {
    const { translateX, trackToY } = usePinchZoom()

    const translate = (x: number) =>
        translateX(x * (stretch?.factor || 1) + (shift?.horizontal || 0))

    const bassShift = trackToY(33)
    const trebleShift = trackToY(97)

    const reducerFor = (scope: 'treble' | 'bass') => {
        return (acc: [number, number][], v: number, i: number) => {
            if (i % 25 !== 0) return acc
            const x = translate(emulation.placeTimeConversion.timeToPlace(i / 1000)! * 10)
            const y = 127 - v + (scope === 'bass' ? bassShift : trebleShift)
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
                    {...pathProps}
                />
            </g>
            <g className="bassVelocities">
                <path
                    d={bassD}
                    fill="none"
                    {...pathProps}
                />
            </g>
        </>
    )
}
