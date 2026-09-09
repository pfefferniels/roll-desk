import { Emulation, PedalCurve } from "linked-rolls"
import { SharedOptions } from "../../helpers/reproducingSystems"
import { useMemo } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { episodes, sparseVertices, Vertex } from "../../helpers/pedalEnvelope"

type PedalsProps = {
    forEmulation: Emulation<SharedOptions>
}

const damperLook: React.SVGProps<SVGPathElement> = {
    fill: 'gray', fillOpacity: 0.1, stroke: 'black', strokeWidth: 0.4
}

/** Held for whole passages, so an outline only, or it would tint every note beneath it. */
const hammerRailLook: React.SVGProps<SVGPathElement> = {
    fill: 'none', stroke: 'dimgray', strokeWidth: 0.6, strokeDasharray: '4 3'
}

const lookOf = (pedal: string) => pedal === 'hammerRail' ? hammerRailLook : damperLook

/**
 * Each pedal as the emulator moves it: a band over the keyboard that opens
 * symmetrically about its middle as the bellows travels, closed to a line
 * with the pedal at rest and fully open with it down. A lift the roll
 * retakes before the bellows has finished shows as a notch that never
 * closes.
 */
export const Pedals = ({ forEmulation: emulation }: PedalsProps) => {
    const { translateX, areaBand, areas } = usePinchZoom()

    const excursions = useMemo(() => emulation.curves
        .filter((curve): curve is PedalCurve => curve.kind === 'pedal')
        .map(curve => ({ pedal: curve.name, episodes: episodes(sparseVertices(curve)) })),
        [emulation]
    )

    const keyboard = areas.find(area => area.role === 'note')
    if (!keyboard) return null

    const { y, height } = areaBand(keyboard)
    const middle = y + height / 2
    const reach = height / 2

    const outline = (episode: readonly Vertex[]) => {
        const edge = (side: 1 | -1) =>
            episode.map(({ place, travel }) => `${translateX(place)} ${middle + side * reach * travel}`)
        return `M ${[...edge(-1), ...edge(1).reverse()].join(' L ')} Z`
    }

    return (
        <g className='pedals'>
            {excursions.map(({ pedal, episodes }) => (
                <g key={pedal} className={pedal}>
                    {episodes.map(episode => (
                        <path
                            key={episode[0].place}
                            d={outline(episode)}
                            {...lookOf(pedal)}
                        />
                    ))}
                </g>
            ))}
        </g>
    )
}
