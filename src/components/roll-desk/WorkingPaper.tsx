import { useEffect, useLayoutEffect, useRef, useState } from "react"
// import { usePiano } from "react-pianosound"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, Edition, AnyEditorialAssumption, Expression, CollatedEvent, StageCreation, findWitnessesWithinStage, Question, Stage, Inference } from "linked-rolls"
import { Dynamics } from "./Dynamics"
import { AllAssumptions } from "./assumptions/AllAssumptions"


const isRelatedTo = (assumption: AnyEditorialAssumption, stageCreation: StageCreation) => {
    if (assumption.type === 'edit' || assumption.type === 'intention') {
        return stageCreation.actions.includes(assumption)
    }
    else {
        if (!assumption.reasons) return false
        for (const reason of assumption.reasons) {
            if (reason.type === 'inference') {
                for (const premise of reason.premises) {
                    if (isRelatedTo(premise, stageCreation)) return true
                }
            }
        }
    }
    return false
}


interface SustainPedalProps {
    on: CollatedEvent
    off: CollatedEvent
}

const SustainPedal = ({ on, off }: SustainPedalProps) => {
    const { translateX, trackToY } = usePinchZoom()

    const onsets = on.wasCollatedFrom.map(e => e.horizontal.from).sort()
    const offsets = off.wasCollatedFrom.map(e => e.horizontal.to).sort()

    if (onsets.length === 0 || offsets.length === 0) return null

    const innerBoundaries = [onsets[0], offsets[0]].map(translateX)
    const y1 = trackToY(88)
    const y2 = trackToY(12)
    const height = y2 - y1

    return (
        <rect
            className='pedal'
            x={innerBoundaries[0]}
            width={innerBoundaries[1] - innerBoundaries[0]}
            y={y1}
            height={height}
            fill='gray'
            fillOpacity={0.1}
            stroke='black'
            strokeWidth={0.4}
        />
    )
}

interface CollatedEventViewerProps {
    event: CollatedEvent
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
                fillOpacity={0.4}
                onClick={onClick}
            />
            <line
                x1={meanOnset}
                x2={meanOnset}
                y1={displayDetails ? trackToY(100) : y - 10}
                y2={displayDetails ? trackToY(0) : y + 20}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7}
            />
            <line
                x1={meanOffset}
                x2={meanOffset}
                y1={displayDetails ? trackToY(100) : y - 10}
                y2={displayDetails ? trackToY(0) : y + 20}
                stroke='black'
                strokeWidth={0.2}
                strokeOpacity={0.7}
            />

            <polygon
                onClick={onClick}
                onMouseEnter={() => setDisplayDetails(true)}
                onMouseLeave={() => setDisplayDetails(false)}
                fill='red'
                fillOpacity={0.15}
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
    const [underlays, setUnderlays] = useState<JSX.Element>()

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

        const underlays =
            <AllAssumptions
                assumptions={[
                    ...currentStage.intentions,
                    ...edition.questions,
                    ...currentStage.edits
                ].filter(assumption => {
                    if (assumption.type === 'question' && !isRelatedTo(assumption, currentStage)) {
                        // exclude questions that are not related to the current stage
                        return false
                    }
                    return true
                })}
                svgHeight={svgRef.current?.getBoundingClientRect().height || 0}
                svgWidth={svgRef.current?.getBoundingClientRect().width || 0}
                svgRef={svgRef}
                onClick={onClick || (() => { })}
            />

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
                .map((event, i) => {
                    const rep = event.wasCollatedFrom[0]
                    if (rep.type === 'expression' && rep.expressionType === 'SustainPedalOn') {
                        const later = edition.collation.events
                            .filter(e => {
                                const rep2 = e.wasCollatedFrom[0]
                                return rep2.type === 'expression' && rep2.expressionType === 'SustainPedalOff' &&
                                    rep2.horizontal.from > rep.horizontal.from
                            })
                        const offEvent = later.reduce((min, curr) => {
                            const minFrom = (min.wasCollatedFrom[0] as Expression).horizontal.from
                            const currFrom = (curr.wasCollatedFrom[0] as Expression).horizontal.from
                            return currFrom < minFrom ? curr : min
                        }, later[0])

                        return (
                            <SustainPedal
                                key={`sustain_${event.id || i}`}
                                on={event}
                                off={offEvent}
                            />
                        )
                    }

                    return (
                        <CollatedEventViewer
                            key={`workingPaper_${event.id || i}`}
                            event={event}
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
                    )
                })}

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

            <g className='overlayContainer' />
        </g>
    )
}
