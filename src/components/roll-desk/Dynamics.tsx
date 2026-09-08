import { DynamicsCurve, Emulation, track } from "linked-rolls"
import { WelteT100Options } from "linked-rolls/welte-t100"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"
import { samplesOnRoll } from "../../helpers/samplesOnRoll"

/** The tracks the two dynamics curves are drawn from. */
const bassSpace = track(20)
const trebleSpace = track(93)

/** Every so many samples of the curve, which has about twelve per millimetre. */
const SAMPLE_STRIDE = 25

type DynamicsProps = {
    forEmulation: Emulation<WelteT100Options>
    pathProps: React.SVGProps<SVGPathElement>
}

export const Dynamics = ({ forEmulation: emulation, pathProps }: DynamicsProps) => {
    const { translateX, trackToY, rollLength } = usePinchZoom()

    const curveNamed = (name: string) =>
        emulation.curves.find((curve): curve is DynamicsCurve => curve.kind === 'dynamics' && curve.name === name)

    const pathOf = (curve: DynamicsCurve | undefined, shift: number) => {
        if (!curve) return ""
        return samplesOnRoll(curve.place, rollLength, SAMPLE_STRIDE)
            .map(index => [translateX(curve.place[index]), 127 - curve.velocity[index] + shift])
            .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
            .join(" ")
    }

    return (
        <>
            <g className="trebleVelocities">
                <path
                    d={pathOf(curveNamed('treble'), trackToY(trebleSpace))}
                    fill="none"
                    {...pathProps}
                />
            </g>
            <g className="bassVelocities">
                <path
                    d={pathOf(curveNamed('bass'), trackToY(bassSpace))}
                    fill="none"
                    {...pathProps}
                />
            </g>
        </>
    )
}

export const DynamicsGrid = ({ velocity }: Pick<WelteT100Options, 'velocity'>) => {
    const { translateX, trackToY, rollLength } = usePinchZoom()

    const bassShift = trackToY(bassSpace)
    const trebleShift = trackToY(trebleSpace)

    const lineAt = (y: number, dashed = false) => (
        <line
            x1={0}
            x2={translateX(rollLength)}
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
