import { RefObject, useCallback, useEffect, useRef, useState } from "react"
import { rollXAt } from "../helpers/pointer"
import { usePinchZoom } from "./usePinchZoom"

/** A drag running along the roll, both ends in millimetres from its start. */
export interface RollDrag {
    from: number
    to: number
}

/** The stretch a drag covers, whichever way round it was drawn. */
export const spanOf = ({ from, to }: RollDrag): [number, number] =>
    [Math.min(from, to), Math.max(from, to)]

/**
 * The drag currently running over `element`, and nothing between drags.
 * The pointer is followed on the window, so a gesture that wanders off
 * the element still ends where the button is released.
 */
export const useRollDrag = (
    element: RefObject<SVGGraphicsElement | null>,
    onDone?: (drag: RollDrag) => void
): RollDrag | undefined => {
    const { zoom } = usePinchZoom()
    const [drag, setDrag] = useState<RollDrag>()

    const done = useRef(onDone)
    useEffect(() => { done.current = onDone })

    const rollX = useCallback((event: MouseEvent) => {
        const target = element.current
        return target ? rollXAt(target, event.clientX, zoom) : undefined
    }, [element, zoom])

    useEffect(() => {
        const target = element.current
        if (!target) return

        const listeners = new AbortController()
        const { signal } = listeners

        const begin = (event: MouseEvent) => {
            const from = rollX(event)
            if (from === undefined) return

            const follow = (event: MouseEvent) => {
                const to = rollX(event)
                if (to !== undefined) setDrag({ from, to })
            }

            const release = (event: MouseEvent) => {
                window.removeEventListener('mousemove', follow)
                window.removeEventListener('mouseup', release)
                setDrag(undefined)
                done.current?.({ from, to: rollX(event) ?? from })
            }

            setDrag({ from, to: from })
            window.addEventListener('mousemove', follow, { signal })
            window.addEventListener('mouseup', release, { signal })
        }

        target.addEventListener('mousedown', begin, { signal })

        return () => {
            listeners.abort()
            setDrag(undefined)
        }
    }, [element, rollX])

    return drag
}
