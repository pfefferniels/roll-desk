import type { Assumption, CollatedEvent, Expression } from "linked-rolls/lib/types"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePiano } from "react-pianosound"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, RollCopy } from "linked-rolls"
import { Dynamics } from "./Dynamics"
import { roundedHull } from "../../helpers/roundedHull"

interface CollatedEventViewerProps {
    event: CollatedEvent
    subjectOfAssumption: boolean
    highlight: boolean
    onClick: () => void
}

const CollatedEventViewer = ({ event, highlight, subjectOfAssumption, onClick }: CollatedEventViewerProps) => {
    const [displayDetails, setDisplayDetails] = useState(false)
    const { translateX, translateY, trackHeight } = usePinchZoom()

    const collatedFrom = event.wasCollatedFrom
    if (!collatedFrom) return null

    const onsets = collatedFrom.map(e => e.hasDimension.from).sort()
    const offsets = collatedFrom.map(e => e.hasDimension.to).sort()

    if (onsets.length === 0 || offsets.length === 0) return null

    const type = collatedFrom[0].type === 'expression' && (collatedFrom[0] as Expression).P2HasType

    const innerBoundaries = [onsets[onsets.length - 1], offsets[0]].map(translateX)
    const onsetStretch = [onsets[0], onsets[onsets.length - 1]].map(translateX)
    const offsetStretch = [offsets[0], offsets[offsets.length - 1]].map(translateX)

    const meanOnset = (onsetStretch[0] + onsetStretch[1]) / 2
    const meanOffset = (offsetStretch[0] + offsetStretch[1]) / 2

    const trackerHole = translateY(100 - collatedFrom[0].trackerHole)

    return (
        <g
            data-id={event.id}
            id={event.id}
            className='collated-event'>
            <rect
                x={innerBoundaries[0]}
                width={innerBoundaries[1] - innerBoundaries[0]}
                y={trackerHole}
                height={5}
                fill={highlight ? 'red' : 'blue'}
                fillOpacity={0.5}
                onClick={onClick}
                onMouseEnter={() => setDisplayDetails(true)}
                onMouseLeave={() => setDisplayDetails(false)} />
            {type === 'SustainPedalOn' || type === 'SustainPedalOff' ?
                <>
                    <line
                        x1={meanOnset}
                        x2={meanOnset}
                        y1={translateY(10)}
                        y2={translateY(90)}
                        stroke='darkred'
                        strokeWidth={0.5} />
                    <line
                        x1={meanOnset}
                        x2={meanOnset + (type === 'SustainPedalOn' ? 10 : -10)}
                        y1={translateY(10)}
                        y2={translateY(10)}
                        stroke='darkred'
                        strokeWidth={0.5} />
                </>
                : (
                    <>
                        <line
                            x1={meanOnset}
                            x2={meanOnset}
                            y1={displayDetails ? 0 : (trackerHole - 5)}
                            y2={displayDetails ? 100 * trackHeight : trackerHole + 10}
                            stroke='black'
                            strokeWidth={0.2} />
                        <line
                            x1={meanOffset}
                            x2={meanOffset}
                            y1={displayDetails ? 0 : (trackerHole - 5)}
                            y2={displayDetails ? 100 * trackHeight : trackerHole + 10}
                            stroke='black'
                            strokeWidth={0.2} />

                    </>
                )}
            <polygon
                onClick={onClick}
                fill='red'
                fillOpacity={0.5}
                points={`${onsetStretch[0]},${trackerHole + 2.5} ${onsetStretch[1]},${trackerHole} ${onsetStretch[1]},${trackerHole + 5}`} />
            <polygon
                onClick={onClick}
                fill='red'
                fillOpacity={0.5}
                points={`${offsetStretch[1]},${trackerHole + 2.5} ${offsetStretch[0]},${trackerHole} ${offsetStretch[0]},${trackerHole + 5}`} />
            {displayDetails && (
                <text
                    x={innerBoundaries[0]}
                    y={trackerHole - 2}
                    fontSize={12}>
                    <tspan>{type}</tspan>
                </text>
            )}
        </g>
    )
}

interface WorkingPaperProps {
    numberOfRolls: number
    events: CollatedEvent[]
    assumptions: Assumption[]
    copies: RollCopy[]
    onClick: (event: CollatedEvent) => void
}

// const AssumptionUnderlay = ({ })

export const WorkingPaper = ({ numberOfRolls, events, assumptions, copies, onClick }: WorkingPaperProps) => {
    const [emulations, setEmulations] = useState<Emulation[]>([])
    const [underlays, setUnderlays] = useState<string[]>()

    const { zoom } = usePinchZoom()
    const { playSingleNote } = usePiano()

    const svgRef = useRef<SVGGElement>(null)

    useEffect(() => {
        // whenever the events change, update the emulation
        const newEmulations = []
        for (const copy of copies) {
            const newEmulation = new Emulation()
            newEmulation.emulateFromCollatedRoll(events, assumptions, copy)
            newEmulations.push(newEmulation)
        }
        setEmulations(newEmulations)

        // and sort them, so that smaller durations will be drawn last
        const avg = (vals: number[]) => vals.reduce((acc, curr) => acc + curr, 0) / vals.length
        const durationOf = (event: CollatedEvent) => {
            const from = avg(event.wasCollatedFrom.map(e => e.hasDimension.from))
            const to = avg(event.wasCollatedFrom.map(e => e.hasDimension.to))

            return to - from
        }

        events.sort((a, b) => durationOf(b) - durationOf(a))
    }, [events, assumptions, copies])

    useLayoutEffect(() => {
        const underlays = []
        for (const assumption of assumptions) {
            if (assumption.type === 'relation') {
                for (const group of assumption.relates) {
                    const points = group.contains
                        .map(e => {
                            return svgRef.current?.querySelector(`[data-id="${e.id}"]`)
                        })
                        .filter(el => !!el)
                        .map(el => {
                            const bbox = (el as SVGGraphicsElement).getBBox()
                            return [
                                [bbox.x, bbox.y] as [number, number],
                                [bbox.x + bbox.width, bbox.y] as [number, number],
                                [bbox.x, bbox.y + bbox.height] as [number, number],
                                [bbox.x + bbox.width, bbox.y + bbox.height] as [number, number]
                            ]
                        })
                        .flat()

                    const hull = roundedHull(points, 2.5)
                    underlays.push(hull)
                }
            }
        }
        setUnderlays(underlays)
    }, [events, assumptions, zoom])

    console.log('underlays=', underlays)

    return (
        <g className='collated-copies' ref={svgRef}>
            {underlays?.map((underlay, i) => {
                return (
                    <path
                        key={`underlay_${i}`}
                        stroke='black'
                        fill='white'
                        strokeWidth={1}
                        d={underlay}
                    />
                )
            })}

            {events.map((event, i) => (
                <CollatedEventViewer
                    key={`workingPaper_${event.id || i}`}
                    event={event}
                    subjectOfAssumption={false}
                    highlight={event.wasCollatedFrom?.length !== numberOfRolls}
                    onClick={() => {
                        if (!emulations.length) return

                        const performingEvents = emulations[0].findEventsPerforming(event.id)
                        const noteOn = performingEvents.find(performedEvent => performedEvent.type === 'noteOn') as PerformedNoteOnEvent | undefined
                        const noteOff = performingEvents.find(performedEvent => performedEvent.type === 'noteOff') as PerformedNoteOffEvent | undefined
                        if (noteOn && noteOff) {
                            playSingleNote(noteOn.pitch, (noteOff.at - noteOn.at) * 1000, 1 / noteOn.velocity)
                        }

                        onClick(event)
                    }} />
            ))}

            {emulations.map((emulation, i) => {
                return (
                    <Dynamics key={`emulation_${i}`} forEmulation={emulation} color={'red'} />
                )
            })}
        </g>
    )
}
