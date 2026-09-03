import { Emulation, EmulationOptions, NuanceCurve } from "linked-rolls"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"

const bassSpace = 20
const trebleSpace = 93

/** Every so many samples of the curve, which has about twelve per millimetre. */
const SAMPLE_STRIDE = 25

type DynamicsProps = {
    forEmulation: Emulation
    pathProps: React.SVGProps<SVGPathElement>
}

export const Dynamics = ({ forEmulation: emulation, pathProps }: DynamicsProps) => {
    const { translateX, trackToY } = usePinchZoom()

    const curves = emulation.curves
    if (!curves) return null

    const bassShift = trackToY(bassSpace)
    const trebleShift = trackToY(trebleSpace)

    const pathOf = (curve: NuanceCurve, shift: number) =>
        Array.from({ length: Math.ceil(curve.place.length / SAMPLE_STRIDE) }, (_, sample) => {
            const i = sample * SAMPLE_STRIDE
            return [translateX(curve.place[i]), 127 - curve.velocity[i] + shift]
        })
            .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
            .join(" ")

    return (
        <>
            <g className="trebleVelocities">
                <path
                    d={pathOf(curves.nuance.treble, trebleShift)}
                    fill="none"
                    {...pathProps}
                />
            </g>
            <g className="bassVelocities">
                <path
                    d={pathOf(curves.nuance.bass, bassShift)}
                    fill="none"
                    {...pathProps}
                />
            </g>
        </>
    )
}

export const DynamicsGrid = ({ velocity }: Pick<EmulationOptions, 'velocity'>) => {
    const { translateX, trackToY, rollLength } = usePinchZoom()

    const bassShift = trackToY(bassSpace)
    const trebleShift = trackToY(trebleSpace)

    const width = translateX(rollLength)

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
            {lineAt(127 - velocity.piano + (scope === 'bass' ? bassShift : trebleShift))}
            {lineAt(127 - velocity.mezzoforte + (scope === 'bass' ? bassShift : trebleShift), true)}
            {lineAt(127 - velocity.forte + (scope === 'bass' ? bassShift : trebleShift))}
        </g>
    )


    return (
        <>
            {forScope('bass')}
            {forScope('treble')}
        </>
    )
}
