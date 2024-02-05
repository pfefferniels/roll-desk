import { CollatedEvent, Expression, Note } from "linked-rolls/lib/.ldo/rollo.typings"
import { useState } from "react"
import { usePiano } from "../../hooks/usePiano"
import { usePinchZoom } from "../../hooks/usePinchZoom"

interface CollatedEventViewerProps {
    event: CollatedEvent
    highlight: boolean
    onClick: () => void
}

const CollatedEventViewer = ({ event, highlight, onClick }: CollatedEventViewerProps) => {
    const [displayDetails, setDisplayDetails] = useState(false)
    const { zoom, pinch, trackHeight } = usePinchZoom()

    const collatedFrom = event.wasCollatedFrom
    if (!collatedFrom) return null

    const onsets = collatedFrom.map(e => e.P43HasDimension.from).sort()
    const offsets = collatedFrom.map(e => e.P43HasDimension.to).sort()

    if (onsets.length === 0 || offsets.length === 0) return null

    const type = collatedFrom[0].type?.["@id"] === 'Expression' && (collatedFrom[0] as Expression).P2HasType["@id"]

    const innerBoundaries = [onsets[onsets.length - 1], offsets[0]].map(v => (v / zoom + pinch))
    const onsetStretch = [onsets[0], onsets[onsets.length - 1]].map(v => (v / zoom + pinch))
    const offsetStretch = [offsets[0], offsets[offsets.length - 1]].map(v => (v / zoom + pinch))

    const meanOnset = (onsetStretch[0] + onsetStretch[1]) / 2
    const meanOffset = (offsetStretch[0] + offsetStretch[1]) / 2

    const trackerHole = (100 - collatedFrom[0].trackerHole) * trackHeight

    return (
        <g
            data-id={event["@id"]}
            id={event["@id"]}
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
                    y={trackerHole}
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
    onClick: (event: CollatedEvent) => void
}

export const WorkingPaper = ({ numberOfRolls, events, onClick }: WorkingPaperProps) => {
    const { playSingleNote } = usePiano()

    return (
        <g className='collated-copies'>
            {events.map((event, i) => (
                <CollatedEventViewer
                    key={`workingPaper_${event["@id"] || i}`}
                    event={event}
                    highlight={event.wasCollatedFrom?.length !== numberOfRolls}
                    onClick={() => {
                        if (event.wasCollatedFrom &&
                            event.wasCollatedFrom.length && 
                            event.wasCollatedFrom[0].type?.["@id"] === 'Note') {
                            playSingleNote((event.wasCollatedFrom[0] as Note))
                        }
                        onClick(event)
                    }} />
            ))}
        </g>
    )
}
