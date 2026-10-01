import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useState, useSyncExternalStore } from "react"
import { Expression, Note } from "linked-rolls"
import { usePinchZoom } from "../canvas/usePinchZoom"
import { laneMeaning } from "./laneMeaning"
import { OnTop } from "../canvas/OnTop"

type Command = Note | Expression

const LookingAt = createContext<Dispatch<SetStateAction<Command | undefined>>>(() => { })

/** Tells the label which command the pointer rests on, or that it has left it. */
export const useLookingAt = () => useContext(LookingAt)

/** How tall the label is, in drawing units, which are pixels. */
const labelHeight = 18

/** Room enough for the longest label; the box itself is only as wide as its text. */
const labelRoom = 320

/** The left edge of what the viewport shows, in drawing units, followed as the roll is scrolled. */
const useLeftEdge = (viewport: HTMLElement | null): number => {
    const subscribe = useCallback((onScroll: () => void) => {
        viewport?.addEventListener('scroll', onScroll, { passive: true })
        return () => viewport?.removeEventListener('scroll', onScroll)
    }, [viewport])

    return useSyncExternalStore(subscribe, () => viewport?.scrollLeft ?? 0)
}

/**
 * The track a command's lane lies on and what it means, written on a white
 * box flush with the left edge of the view and centred on the lane. It is
 * set as HTML, so that the box takes the width of its text.
 */
const LaneLabel = ({ command }: { command: Command }) => {
    const { bar, trackToY, laneHeight, viewport } = usePinchZoom()
    const left = useLeftEdge(viewport)

    const lane = laneMeaning(command, bar)
    if (!lane) return null

    const middle = trackToY(lane.track) + laneHeight(lane.track) / 2

    return (
        <OnTop>
            <foreignObject
                className='laneLabel'
                x={left}
                y={middle - labelHeight / 2}
                width={labelRoom}
                height={labelHeight}
                pointerEvents='none'
            >
                <span
                    style={{
                        display: 'inline-block',
                        height: labelHeight,
                        lineHeight: `${labelHeight}px`,
                        boxSizing: 'border-box',
                        padding: '0 6px',
                        background: 'white',
                        border: '1px solid #d0d0d0',
                        borderLeft: 'none',
                        borderRadius: '0 3px 3px 0',
                        fontSize: 12,
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span style={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{lane.track}</span>
                    {' '}
                    <b>{lane.meaning}</b>
                </span>
            </foreignObject>
        </OnTop>
    )
}

/**
 * The drawing of a version, with what the lane of the command under the
 * pointer means on the version's bar written over it, at the left edge of
 * the view however far the roll is scrolled. The label is drawn in the
 * canvas's top layer, so nothing on the roll covers it, and it is held here
 * rather than by the version, so that pointing at another command redraws
 * only the label.
 */
export const LabelledLanes = ({ children }: { children: ReactNode }) => {
    const [command, setCommand] = useState<Command>()

    return (
        <LookingAt.Provider value={setCommand}>
            {children}
            {command && <LaneLabel command={command} />}
        </LookingAt.Provider>
    )
}
