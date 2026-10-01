import { add, DynamicsCurve, Emulation, mm, subtract, TrackRole } from "linked-rolls"
import { VelocityMap } from "linked-rolls/welte-t100"
import { RollGeometry } from "../canvas/rollGeometry"
import { SharedOptions } from "../playback/reproducingSystems"
import { usePinchZoom } from "../canvas/usePinchZoom.tsx"
import { samplesOnRoll } from "./samplesOnRoll"
import { Svg, svg } from "../canvas/units"

/** How tall a curve's band is, from piano at its foot to forte at its head. */
const BAND = svg(80)

/** The air left between a band and the block of valves beside it. */
const GAP = svg(10)

/** What a band takes beyond the bar, above it for the treble and below it for the bass. */
export const dynamicsRoom = add(BAND, GAP)

type Scope = 'bass' | 'treble'

/**
 * Where each curve's band has its foot: beyond the bar, the treble's
 * above the block of treble valves and the bass's below the bass valves,
 * so that a curve stands beside the commands that shape it rather than
 * over them. Taken off the bar rather than named as tracks, the blocks
 * being different sizes on every scale.
 */
export const feetIn = ({ areas, areaBand, height }: Pick<RollGeometry, 'areas' | 'areaBand' | 'height'>): Record<Scope, Svg> => {
    const blockOf = (role: TrackRole) => {
        const area = areas.find(area => area.role === role)
        return area && areaBand(area)
    }

    const treble = blockOf('treble-expression')
    const bass = blockOf('bass-expression')

    return {
        treble: subtract(treble?.y ?? svg(0), GAP),
        bass: add(bass ? add(bass.y, bass.height) : height, dynamicsRoom)
    }
}

/** Where a velocity is drawn: as a height above its band's foot, piano on the foot and forte at the head. */
export const heightOf = (velocity: number, foot: Svg, { piano, forte }: VelocityMap): Svg =>
    svg(foot - (velocity - piano) / (forte - piano) * BAND)

/** Every so many samples of the curve, which has about twelve per millimetre. */
const SAMPLE_STRIDE = 25

type DynamicsProps = {
    forEmulation: Emulation<SharedOptions>
    pathProps: React.SVGProps<SVGPathElement>
}

export const Dynamics = ({ forEmulation: emulation, pathProps }: DynamicsProps) => {
    const { translateX, rollLength, areas, areaBand, height } = usePinchZoom()
    const feet = feetIn({ areas, areaBand, height })
    const { velocity } = emulation.options

    const pathOf = (scope: Scope) => {
        const curve = emulation.curves.find((curve): curve is DynamicsCurve =>
            curve.kind === 'dynamics' && curve.name === scope)
        if (!curve) return ""

        return samplesOnRoll(curve.place, rollLength, SAMPLE_STRIDE)
            .flatMap(index => {
                const along = curve.place[index]
                const loudness = curve.velocity[index]
                if (along === undefined || loudness === undefined) return []
                return [[translateX(mm(along)), heightOf(loudness, feet[scope], velocity)] as const]
            })
            .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
            .join(" ")
    }

    return (
        <>
            <g className="trebleVelocities">
                <path d={pathOf('treble')} fill="none" {...pathProps} />
            </g>
            <g className="bassVelocities">
                <path d={pathOf('bass')} fill="none" {...pathProps} />
            </g>
        </>
    )
}

export const DynamicsGrid = ({ velocity }: SharedOptions) => {
    const { translateX, rollLength, areas, areaBand, height } = usePinchZoom()
    const feet = feetIn({ areas, areaBand, height })

    const lineAt = (y: Svg, dashed = false) => (
        <line
            x1={svg(0)}
            x2={translateX(rollLength)}
            y1={y}
            y2={y}
            stroke="darkblue"
            strokeWidth={0.2}
            strokeDasharray={dashed ? '20,20' : undefined}
        />
    )

    const forScope = (scope: Scope) => (
        <g className='dynamicsGrid'>
            {lineAt(heightOf(velocity.piano, feet[scope], velocity))}
            {lineAt(heightOf(velocity.mezzoforte, feet[scope], velocity), true)}
            {lineAt(heightOf(velocity.forte, feet[scope], velocity))}
        </g>
    )

    return (
        <>
            {forScope('bass')}
            {forScope('treble')}
        </>
    )
}
