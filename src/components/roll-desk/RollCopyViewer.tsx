import { Emulation, RollCopy } from "linked-rolls"
import { Expression, Note } from "linked-rolls/lib/types"
import { usePiano } from "../../hooks/usePiano"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { useEffect, useState } from "react"
import { Dynamics } from "./Dynamics"
import { createPortal } from "react-dom"

interface RollCopyViewerProps {
    copy: RollCopy
    onTop: boolean
    onClick: (e: Note | Expression) => void
    color: string
}

export const RollCopyViewer = ({ copy, onTop, color, onClick }: RollCopyViewerProps) => {
    const { zoom, pinch, trackHeight } = usePinchZoom()
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
                        onClick={() => {
                            if (event.type === 'note') {
                                playSingleNote(event.hasPitch)
                            }
                            onClick(event)
                        }}
                        data-id={event.id}
                        id={event.id}
                        x={event.hasDimension.from * (1 / zoom) + pinch}
                        width={(event.hasDimension.to - event.hasDimension.from) * (1 / zoom)}
                        height={5}
                        fillOpacity={onTop ? 0.8 : 0.4}
                        fill={onTop ? color : 'gray'}
                        y={(100 - event.trackerHole) * trackHeight}>
                    </rect>
                ))}

                {emulation && <Dynamics forEmulation={emulation} color={color} />}
            </g>
        </>
    )
}

