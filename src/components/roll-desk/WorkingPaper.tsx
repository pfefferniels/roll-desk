import { CollatedEvent } from "linked-rolls/lib/.ldo/rollo.typings"

interface CollatedEventViewerProps {
    event: CollatedEvent
    onClick: () => void
}

const CollatedEventViewer = ({ event, onClick }: CollatedEventViewerProps) => {
    const collatedFrom = event.wasCollatedFrom
    if (!collatedFrom) return null

    const onsets = collatedFrom.map(e => e.P43HasDimension.from).sort()
    const offsets = collatedFrom.map(e => e.P43HasDimension.to).sort()

    if (onsets.length === 0 || offsets.length === 0) return null

    const innerBoundaries = [onsets[onsets.length - 1] / 5, offsets[0] / 5]
    const onsetStretch = [onsets[0] / 5, onsets[onsets.length - 1] / 5]
    const offsetStretch = [offsets[0] / 5, offsets[offsets.length - 1] / 5]

    const trackerHole = (100 - collatedFrom[0].trackerHole) * 5

    return (
        <g className='collated-event'>
            <rect
                x={innerBoundaries[0]}
                width={innerBoundaries[1] - innerBoundaries[0]}
                y={trackerHole}
                height={5}
                fill='blue'
                fillOpacity={0.2}
                onClick={onClick} />
            <polygon
                onClick={onClick}
                fill='blue'
                fillOpacity={0.2}
                points={`${onsetStretch[0]},${trackerHole + 2.5} ${onsetStretch[1]},${trackerHole} ${onsetStretch[1]},${trackerHole + 5}`} />
            <polygon
                onClick={onClick}
                fill='blue'
                fillOpacity={0.2}
                points={`${offsetStretch[1]},${trackerHole + 2.5} ${offsetStretch[0]},${trackerHole} ${offsetStretch[0]},${trackerHole + 5}`} />
        </g>
    )
}

interface CollationViewerProps {
    events: CollatedEvent[]
    onClick: (event: CollatedEvent) => void
}

export const WorkingPaper = ({ events, onClick }: CollationViewerProps) => {
    return (
        <g className='collated-copies'>
            {events.map((event, i) => (
                <CollatedEventViewer event={event} onClick={() => onClick(event)} />
            ))}
        </g>
    )
}
