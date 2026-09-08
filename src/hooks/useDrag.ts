import { RefObject, useEffect, useRef, useState } from "react"

/** A drag, both ends measured the same way. */
export interface Drag<T> {
    from: T
    to: T
}

/** Holds the newest value for listeners that outlive the render they were bound in. */
const useLatest = <T>(value: T) => {
    const latest = useRef(value)
    useEffect(() => { latest.current = value })
    return latest
}

/**
 * The drag currently running over `element`, and nothing between drags.
 * `measure` says where a pointer sits in whatever the drag is drawn in and
 * declines a position the drag cannot use, which leaves the drag standing
 * where it last was. The pointer is followed on the window, so a gesture
 * that wanders off the element still ends where the button is released.
 */
export const useDrag = <T>(
    element: RefObject<SVGGraphicsElement | null>,
    measure: (event: MouseEvent) => T | undefined,
    onDone?: (drag: Drag<T>) => void
): Drag<T> | undefined => {
    const [drag, setDrag] = useState<Drag<T>>()

    const measuring = useLatest(measure)
    const done = useLatest(onDone)

    useEffect(() => {
        const target = element.current
        if (!target) return

        const listeners = new AbortController()
        let gesture: AbortController | undefined

        const begin = (event: MouseEvent) => {
            const from = measuring.current(event)
            if (from === undefined) return

            gesture?.abort()
            const following = new AbortController()
            gesture = following

            let latest: Drag<T> = { from, to: from }

            const follow = (event: MouseEvent) => {
                const to = measuring.current(event)
                if (to === undefined) return

                latest = { from, to }
                setDrag(latest)
            }

            const release = (event: MouseEvent) => {
                follow(event)
                following.abort()
                setDrag(undefined)
                done.current?.(latest)
            }

            setDrag(latest)
            window.addEventListener('mousemove', follow, { signal: following.signal })
            window.addEventListener('mouseup', release, { signal: following.signal })
        }

        target.addEventListener('mousedown', begin, { signal: listeners.signal })

        return () => {
            gesture?.abort()
            listeners.abort()
            setDrag(undefined)
        }
    }, [element, measuring, done])

    return drag
}
