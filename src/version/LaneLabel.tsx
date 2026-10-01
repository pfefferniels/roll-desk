import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useState, useSyncExternalStore } from "react"
import { Expression, Note } from "linked-rolls"
import { usePinchZoom } from "../canvas/usePinchZoom"
import { laneMeaning } from "./laneMeaning"

type Command = Note | Expression

const LookingAt = createContext<Dispatch<SetStateAction<Command | undefined>>>(() => { })

/** Tells the label which command the pointer rests on, or that it has left it. */
export const useLookingAt = () => useContext(LookingAt)

/** How far in from the left edge of the view the label is written. */
const inset = 6

/** The left edge of what the viewport shows, in drawing units, followed as the roll is scrolled. */
const useLeftEdge = (viewport: HTMLElement | null): number => {
    const subscribe = useCallback((onScroll: () => void) => {
        viewport?.addEventListener('scroll', onScroll, { passive: true })
        return () => viewport?.removeEventListener('scroll', onScroll)
    }, [viewport])

    return useSyncExternalStore(subscribe, () => viewport?.scrollLeft ?? 0)
}

/** What a command's lane means, written at the left edge of the view level with the lane. */
const LaneLabel = ({ command }: { command: Command }) => {
    const { bar, trackToY, laneHeight, viewport } = usePinchZoom()
    const left = useLeftEdge(viewport)

    const lane = laneMeaning(command, bar)
    if (!lane) return null

    return (
        <text
            className='laneLabel'
            x={left + inset}
            y={trackToY(lane.track) + laneHeight(lane.track) / 2}
            dominantBaseline='central'
            fontSize={12}
            stroke='white'
            strokeWidth={3}
            strokeLinejoin='round'
            paintOrder='stroke'
            pointerEvents='none'
        >
            <tspan fontWeight='bold'>{lane.meaning}</tspan>
            <tspan fill='#6b7280'> · track {lane.track}</tspan>
        </text>
    )
}

/**
 * The drawing of a version, with what the lane of the command under the
 * pointer means on the version's bar written over it, at the left edge of
 * the view however far the roll is scrolled. The label is drawn last, so
 * nothing on the roll covers it, and it is held here rather than by the
 * version, so that pointing at another command redraws only the label.
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
