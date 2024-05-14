import { Emulation, RollCopy } from "linked-rolls"
import { Expression, Note } from "linked-rolls/lib/types"
import { usePiano } from "../../hooks/usePiano"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { useEffect, useState } from "react"
import { Dynamics } from "./Dynamics"

interface RollCopyViewerProps {
    copy: RollCopy
    onTop: boolean
    onClick: (e: Note | Expression) => void
    color: string
}

export const RollCopyViewer = ({ copy, onTop, color, onClick }: RollCopyViewerProps) => {
    const { translateX, translateY } = usePinchZoom()
    const { playSingleNote } = usePiano()

    const [emulation, setEmulation] = useState<Emulation>()

    useEffect(() => {
        // whenever the events change, update the emulation
        const newEmulation = new Emulation()
        newEmulation?.emulateFromRoll(copy.events)
        setEmulation(newEmulation)
    }, [copy])

    return (
        <>
            <g className='roll-copy'>
                {copy.events.map((event, i) => (
                    <rect
                        key={event.id}
                        onClick={(e) => {
                            if (event.type === 'note') {
                                playSingleNote(event.hasPitch)
                            }

                            if (e.metaKey && event.annotates) {
                                window.open(event.annotates)
                                return
                            }

                            onClick(event)
                        }}
                        data-id={event.id}
                        id={event.id}
                        x={translateX(event.hasDimension.from)}
                        width={translateX(event.hasDimension.to) - translateX(event.hasDimension.from)}
                        height={5}
                        fillOpacity={onTop ? 0.8 : 0.4}
                        fill={onTop ? color : 'gray'}
                        y={translateY(100 - event.trackerHole)}>
                    </rect>
                ))}

                {emulation && <Dynamics forEmulation={emulation} color={color} />}
            </g>
        </>
    )
}

