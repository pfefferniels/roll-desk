import { Emulation, EmulationOptions } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"

const bassSpace = 20
const trebleSpace = 93

type DynamicsProps = {
    forEmulation: Emulation
    pathProps: React.SVGProps<SVGPathElement>
}

export const Dynamics = ({ forEmulation: emulation, pathProps }: DynamicsProps) => {
    const { translateX, trackToY } = usePinchZoom()

    const bassShift = trackToY(bassSpace)
    const trebleShift = trackToY(trebleSpace)

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

export const DynamicsGrid = ({ welte_p, welte_mf, welte_f }: EmulationOptions) => {
    const { translateX, trackToY } = usePinchZoom()

    const bassShift = trackToY(bassSpace)
    const trebleShift = trackToY(trebleSpace)

    const width = translateX(100000)

    const lineAt = (y: number, dashed = false) => (
        <line
            x1={0}
            x2={width}
            y1={y}
            y2={y}
            stroke="darkblue"
            strokeWidth={0.2}
            strokeDasharray={dashed ? '20,20' : undefined}
        />
    )

    const forScope = (scope: 'bass' | 'treble') => (
        <g className='dynamicsGrid'>
            {lineAt(127 - welte_p + (scope === 'bass' ? bassShift : trebleShift))}
            {lineAt(127 - welte_mf + (scope === 'bass' ? bassShift : trebleShift), true)}
            {lineAt(127 - welte_f + (scope === 'bass' ? bassShift : trebleShift))}
        </g>
    )


    return (
        <>
            {forScope('bass')}
            {forScope('treble')}
        </>
    )
}
