import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePiano } from "react-pianosound"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, Edition, AnyEditorialAssumption, Expression, CollatedEvent, StageCreation, findWitnessesWithinStage } from "linked-rolls"
import { Dynamics } from "./Dynamics"
import { AssumptionUnderlay } from "./AssumptionUnderlay"

interface CollatedEventViewerProps {
    event: CollatedEvent
    subjectOfAssumption: boolean
    highlight: boolean
    onClick: () => void
}

const CollatedEventViewer = ({ event, highlight, onClick }: CollatedEventViewerProps) => {
    const [displayDetails, setDisplayDetails] = useState(false)
    const { translateX, trackToY, trackHeight } = usePinchZoom()

    const collatedFrom = event.wasCollatedFrom
    if (!collatedFrom) return null

    const onsets = collatedFrom.map(e => e.horizontal.from).sort()
    const offsets = collatedFrom.map(e => e.horizontal.to).sort()

    if (onsets.length === 0 || offsets.length === 0) return null

    const type = collatedFrom[0].type === 'expression' && (collatedFrom[0] as Expression).expressionType

    const innerBoundaries = [onsets[onsets.length - 1], offsets[0]].map(translateX)
    const onsetStretch = [onsets[0], onsets[onsets.length - 1]].map(translateX)
    const offsetStretch = [offsets[0], offsets[offsets.length - 1]].map(translateX)

    const meanOnset = (onsetStretch[0] + onsetStretch[1]) / 2
    const meanOffset = (offsetStretch[0] + offsetStretch[1]) / 2

    const y = trackToY(collatedFrom[0].vertical.from)
    const height = event.wasCollatedFrom[0].type === 'note' ? trackHeight.note : trackHeight.expression

    return (
        <g
            data-id={event.id}
            id={event.id}
            className='collated-event'
        >
            <rect
                x={innerBoundaries[0]}
                width={innerBoundaries[1] - innerBoundaries[0]}
                y={y}
                height={height}
                fill={highlight ? 'red' : 'black'}
                onClick={onClick}
            />
            {type === 'SustainPedalOn' || type === 'SustainPedalOff' ?
                <polygon
                    fill="none"
                    stroke="darkred"
                    strokeWidth={1}
                    points={`
                            ${meanOnset},${trackToY(11)}
                            ${meanOnset + (type === 'SustainPedalOn' ? 10 : -10)},${trackToY(11)}
                            ${meanOnset + (type === 'SustainPedalOn' ? 10 : -10)},${trackToY(89)}
                            ${meanOnset},${trackToY(89)}
                        `}
                />
                : (
                    <>
                        <line
                            x1={meanOnset}
                            x2={meanOnset}
                            y1={displayDetails ? trackToY(100) : y - 10}
                            y2={displayDetails ? trackToY(0) : y + 20}
                            stroke='black'
                            strokeWidth={0.2} />
                        <line
                            x1={meanOffset}
                            x2={meanOffset}
                            y1={displayDetails ? trackToY(100) : y - 10}
                            y2={displayDetails ? trackToY(0) : y + 20}
                            stroke='black'
                            strokeWidth={0.2} />

                        <polygon
                            onClick={onClick}
                            onMouseEnter={() => setDisplayDetails(true)}
                            onMouseLeave={() => setDisplayDetails(false)}
                            fill='red'
                            fillOpacity={0.2}
                            points={`
                        ${onsetStretch[0]},${y + height / 2}
                        ${innerBoundaries[0]},${y}
                        ${innerBoundaries[1]},${y}
                        ${offsetStretch[1]},${y + height / 2}
                        ${innerBoundaries[1]},${y + height}
                        ${innerBoundaries[0]},${y + height}
                    `}
                        />
                        {displayDetails && (
                            <text
                                x={innerBoundaries[0]}
                                y={y - 2}
                                fontSize={12}
                            >
                                <tspan>{type}</tspan>
                            </text>
                        )}
                    </>
                )}
        </g>
    )
}

interface WorkingPaperProps {
    currentStage?: StageCreation
    edition: Edition
    onClick?: (event: CollatedEvent | AnyEditorialAssumption) => void
}

export const WorkingPaper = ({ currentStage, edition, onClick }: WorkingPaperProps) => {
    const [emulation, setEmulation] = useState<Emulation>()
    const [prevEmulation, setPrevEmulation] = useState<Emulation>()
    const [underlays, setUnderlays] = useState<JSX.Element[]>()

    const { zoom } = usePinchZoom()
    // const { playSingleNote } = usePiano()

    const svgRef = useRef<SVGGElement>(null)

    const numberOfRolls = edition.collation.measured.length

    useEffect(() => {
        if (!currentStage) return

        const emulation = new Emulation()
        emulation.emulateFromEdition(edition, currentStage.created)
        setEmulation(emulation)

        const prevStage = currentStage.basedOn.original
        if ('witnesses' in prevStage) {
            const prevEmulation = new Emulation()
            prevEmulation.emulateFromEdition(edition, prevStage)
            setPrevEmulation(prevEmulation)
        }

        // sort events, so that smaller durations will be drawn last
        const avg = (vals: number[]) => vals.reduce((acc, curr) => acc + curr, 0) / vals.length
        const durationOf = (event: CollatedEvent) => {
            const from = avg(event.wasCollatedFrom.map(e => e.horizontal.from))
            const to = avg(event.wasCollatedFrom.map(e => e.horizontal.to))

            return to - from
        }

        edition.collation.events.sort((a, b) => durationOf(b) - durationOf(a))
    }, [edition, currentStage])

    useLayoutEffect(() => {
        if (!currentStage) return

        const underlays = ([
            ...currentStage.intentions,
            ...edition.questions,
            ...currentStage.edits
        ]).map(edit => (
            <AssumptionUnderlay
                key={`underlay_${edit.id}`}
                assumption={edit}
                svgRef={svgRef}
                onClick={onClick || (() => { })}
            />
        ))

        setUnderlays(underlays)
    }, [edition, zoom, onClick, currentStage])

    return (
        <g className='collated-copies' ref={svgRef}>
            {underlays}

            {edition.collation.events
                .filter(event => {
                    if (currentStage?.edits
                        .find(edit => [...(edit.insert || []), ...(edit.delete || [])].includes(event))
                    ) {
                        return true
                    }

                    return currentStage
                        ? findWitnessesWithinStage(event, currentStage.created).size > 0
                        : true
                })
                .map((event, i) => (
                    <CollatedEventViewer
                        key={`workingPaper_${event.id || i}`}
                        event={event}
                        subjectOfAssumption={false}
                        highlight={currentStage ? false : (event.wasCollatedFrom?.length !== numberOfRolls)}
                        onClick={() => {
                            if (!emulation) return

                            const performingEvents = emulation.findEventsPerforming(event.id)
                            const noteOn = performingEvents.find(performedEvent => performedEvent.type === 'noteOn') as PerformedNoteOnEvent | undefined
                            const noteOff = performingEvents.find(performedEvent => performedEvent.type === 'noteOff') as PerformedNoteOffEvent | undefined
                            if (noteOn && noteOff) {
                                // playSingleNote(noteOn.pitch, (noteOff.at - noteOn.at) * 1000, 1 / noteOn.velocity)
                            }

                            onClick && onClick(event)
                        }}
                    />
                ))}

            {prevEmulation && (
                <Dynamics
                    forEmulation={prevEmulation}
                    pathProps={{
                        stroke: 'gray',
                        strokeWidth: 3,
                        strokeOpacity: 0.4
                    }}
                />
            )}

            {emulation && (
                <Dynamics
                    forEmulation={emulation}
                    pathProps={{
                        stroke: 'black',
                        strokeWidth: 1.5
                    }}
                />
            )}
        </g>
    )
}
