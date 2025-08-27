import { Emulation } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"

type DynamicsProps ={
    forEmulation: Emulation
    pathProps: React.SVGProps<SVGPathElement>
} 

export const Dynamics = ({ forEmulation: emulation, pathProps }: DynamicsProps) => {
    const { translateX, trackToY, getRepresentativeTrack } = usePinchZoom()

    // Use representative tracks from the proper expression areas for the current roll system
    const bassShift = trackToY(getRepresentativeTrack('bass-expression'))
    const trebleShift = trackToY(getRepresentativeTrack('treble-expression'))

    const reducerFor = (scope: 'treble' | 'bass') => {
        return (acc: [number, number][], v: number, i: number) => {
            if (i % 25 !== 0) return acc
            const x = translateX(emulation.placeTimeConversion.timeToPlace(i / 1000)! * 10)
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
