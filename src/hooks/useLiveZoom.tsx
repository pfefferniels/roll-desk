import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface ZoomRange {
    min: number
    max: number
}

/** Roll position held still for the running gesture, and where in the viewport it sits. */
interface Anchor {
    roll: number
    offset: number
}

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

    /**
     * Feed a continuous gesture. Cheap enough to call on every pointer move.
     * `focus` is the viewport x held still while zooming, the middle by default.
     */
    scrub: (zoom: number, focus?: number) => void

    /** Like `scrub`, but relative to the zoom the gesture started from. */
    scrubBy: (factor: number, focus?: number) => void

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
export const useLiveZoom = (initial: number, range: ZoomRange): LiveZoom => {
    const [committed, setCommitted] = useState(initial)

    const stageRef = useRef<SVGGElement>(null)
    const viewportRef = useRef<HTMLDivElement>(null)

    const committedRef = useRef(initial)
    const live = useRef(initial)
    const frame = useRef<number>(undefined)

    const gesturing = useRef(false)

    /** Zoom the running gesture started from. */
    const origin = useRef(initial)

    const anchor = useRef<Anchor>(undefined)

    /** Canvas width the running gesture started from, which it scales along. */
    const baseWidth = useRef<number>(undefined)

    const holdAnchor = useCallback(() => {
        const viewport = viewportRef.current
        if (!viewport || !anchor.current) return

        const { roll, offset } = anchor.current
        viewport.scrollLeft = roll * live.current - offset
    }, [])

    const begin = useCallback((focus?: number) => {
        gesturing.current = true
        origin.current = live.current

        const viewport = viewportRef.current
        if (viewport) {
            const offset = focus ?? viewport.clientWidth / 2
            anchor.current = { roll: (viewport.scrollLeft + offset) / live.current, offset }
        }
        else {
            anchor.current = undefined
        }

        baseWidth.current = stageRef.current?.ownerSVGElement?.width.baseVal.value
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

    const scrub = useCallback((zoom: number, focus?: number) => {
        if (!gesturing.current) begin(focus)

        live.current = Math.min(range.max, Math.max(range.min, zoom))
        if (frame.current === undefined) {
            frame.current = requestAnimationFrame(paint)
        }
    }, [begin, paint, range.min, range.max])

    const scrubBy = useCallback((factor: number, focus?: number) => {
        if (!gesturing.current) begin(focus)

        scrub(origin.current * factor, focus)
    }, [begin, scrub])

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

    return { committed, stageRef, viewportRef, scrub, scrubBy, settle, jump }
}
