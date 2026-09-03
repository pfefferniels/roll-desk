import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface LiveZoom {
    /**
     * The zoom the drawing is laid out against. It only moves once a
     * gesture has settled, so everything derived from it — hulls, arrow
     * heads, level of detail — is exact whenever the roll is at rest.
     */
    committed: number

    /** The group carrying the drawing. A running gesture scales it horizontally. */
    stageRef: RefObject<SVGGElement | null>

    /** The scrolling viewport, held at the same place in the roll while zooming. */
    viewportRef: RefObject<HTMLDivElement | null>

    /** Feed a continuous gesture. Cheap enough to call on every pointer move. */
    scrub: (zoom: number) => void

    /** End the gesture and lay the drawing out again at the zoom last scrubbed to. */
    settle: () => void

    /** Go to a zoom in one step, laying out immediately. */
    jump: (zoom: number) => void
}

/**
 * Horizontal zoom, split into a value the drawing is laid out against and
 * a value the gesture is currently at. While the two differ the difference
 * rides on a single `scale(ratio, 1)` on the stage, which costs one
 * attribute write rather than a re-render of every perforation. Settling
 * folds the ratio back into the layout, so the distortion a non-uniform
 * scale introduces — elliptical hull corners, slanted arrow heads,
 * stretched labels — only ever lasts as long as the gesture.
 */
export const useLiveZoom = (initial: number): LiveZoom => {
    const [committed, setCommitted] = useState(initial)

    const stageRef = useRef<SVGGElement>(null)
    const viewportRef = useRef<HTMLDivElement>(null)

    const committedRef = useRef(initial)
    const live = useRef(initial)
    const frame = useRef<number>(undefined)

    const gesturing = useRef(false)

    /** Roll position held under the middle of the viewport for the running gesture. */
    const anchor = useRef<number>(undefined)

    /** Canvas width the running gesture started from, which it scales along. */
    const baseWidth = useRef<number>(undefined)

    const holdAnchor = useCallback(() => {
        const viewport = viewportRef.current
        if (!viewport || anchor.current === undefined) return

        viewport.scrollLeft = anchor.current * live.current - viewport.clientWidth / 2
    }, [])

    const paint = useCallback(() => {
        frame.current = undefined

        const stage = stageRef.current
        if (!stage) return

        const ratio = live.current / committedRef.current

        // The canvas has to grow with the gesture, or zooming in would run
        // the drawing past the edge of the SVG viewport and clip it.
        const canvas = stage.ownerSVGElement
        if (canvas && baseWidth.current !== undefined) {
            canvas.setAttribute('width', String(baseWidth.current * ratio))
        }

        stage.setAttribute('transform', `scale(${ratio} 1)`)
        stage.style.setProperty('--counter-scale', String(1 / ratio))

        holdAnchor()
    }, [holdAnchor])

    const scrub = useCallback((zoom: number) => {
        if (!gesturing.current) {
            gesturing.current = true

            const viewport = viewportRef.current
            anchor.current = viewport
                ? (viewport.scrollLeft + viewport.clientWidth / 2) / live.current
                : undefined
            baseWidth.current = stageRef.current?.ownerSVGElement?.width.baseVal.value
        }

        live.current = zoom
        if (frame.current === undefined) {
            frame.current = requestAnimationFrame(paint)
        }
    }, [paint])

    const settle = useCallback(() => {
        if (frame.current !== undefined) {
            cancelAnimationFrame(frame.current)
            frame.current = undefined
        }
        gesturing.current = false
        setCommitted(live.current)
    }, [])

    const jump = useCallback((zoom: number) => {
        scrub(zoom)
        settle()
    }, [scrub, settle])

    // The gesture is over: the ratio is one again, so drop it and let the
    // freshly laid-out drawing stand on its own.
    useLayoutEffect(() => {
        committedRef.current = committed
        live.current = committed

        const stage = stageRef.current
        if (stage) {
            stage.removeAttribute('transform')
            stage.style.removeProperty('--counter-scale')
        }

        holdAnchor()
    }, [committed, holdAnchor])

    useEffect(() => () => {
        if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }, [])

    return { committed, stageRef, viewportRef, scrub, settle, jump }
}
