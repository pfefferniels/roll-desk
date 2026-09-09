import { DynamicsCurve, Emulation, TrackRole } from "linked-rolls"
import { RollGeometry } from "../../helpers/rollGeometry"
import { SharedOptions } from "../../helpers/reproducingSystems"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"
import { samplesOnRoll } from "../../helpers/samplesOnRoll"

/**
 * Where each curve is drawn from: the top of the block of valves it
 * belongs to, so a curve sits with the commands that shape it and the
 * two do not overlap. Taken off the bar rather than named as tracks,
 * the blocks being different sizes on every scale.
 */
const anchorsIn = (geometry: Pick<RollGeometry, 'areas' | 'areaBand'>) => {
    const topOf = (role: TrackRole) => {
        const area = geometry.areas.find(band => band.role === role)
        return area ? geometry.areaBand(area).y : 0
    }

    return { bass: topOf('bass-expression'), treble: topOf('treble-expression') }
}

/** Every so many samples of the curve, which has about twelve per millimetre. */
const SAMPLE_STRIDE = 25

type DynamicsProps = {
    forEmulation: Emulation<SharedOptions>
    pathProps: React.SVGProps<SVGPathElement>
}

export const Dynamics = ({ forEmulation: emulation, pathProps }: DynamicsProps) => {
    const { translateX, rollLength, areas, areaBand } = usePinchZoom()
    const anchor = anchorsIn({ areas, areaBand })

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
                    d={pathOf(curveNamed('treble'), anchor.treble)}
                    fill="none"
                    {...pathProps}
                />
            </g>
            <g className="bassVelocities">
                <path
                    d={pathOf(curveNamed('bass'), anchor.bass)}
                    fill="none"
                    {...pathProps}
                />
            </g>
        </>
    )
}

export const DynamicsGrid = ({ velocity }: SharedOptions) => {
    const { translateX, rollLength, areas, areaBand } = usePinchZoom()

    const { bass: bassShift, treble: trebleShift } = anchorsIn({ areas, areaBand })

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
