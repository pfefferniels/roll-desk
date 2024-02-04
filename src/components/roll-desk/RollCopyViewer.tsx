import { RollCopy } from "linked-rolls"
import { Expression, Note } from "linked-rolls/lib/.ldo/rollo.typings"
import { usePiano } from "../../hooks/usePiano"

interface RollCopyViewerProps {
    copy: RollCopy
    onTop: boolean
    onClick: (e: Note | Expression) => void
    color: string
}

export const RollCopyViewer = ({ copy, onTop, color, onClick }: RollCopyViewerProps) => {
    const { playSingleNote } = usePiano()

    return (
        <g className='roll-copy'>
            <rect fill='white' fillOpacity={0.1} x={0} y={0} height={100 * 5} width={copy.events[copy.events.length - 1].P43HasDimension.to / 5}></rect>
            {copy.events.map((event, i) => (
                <rect
                    key={event["@id"] || `event_${i}`}
                    onClick={() => {
                        console.log('click')
                        if (event.type?.["@id"] === 'Note') {
                            playSingleNote(event as Note)
                        }
                        onClick(event)
                    }}
                    data-id={event["@id"]}
                    id={event["@id"]}
                    x={event.P43HasDimension.from / 5}
                    width={(event.P43HasDimension.to - event.P43HasDimension.from) / 5}
                    height={5}
                    fillOpacity={onTop ? 0.8 : 0.4}
                    fill={onTop ? color : 'gray'}
                    y={(100 - event.trackerHole) * 5}>
                </rect>
            ))}
        </g>
    )
}

