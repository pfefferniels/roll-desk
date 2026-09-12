import { RefCallback, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clamp, Millimeters, scale } from 'linked-rolls'
import { drawnAt, placeAt, Svg, svg, SvgPerMm } from '../helpers/units'

export interface ZoomRange {
    min: SvgPerMm
    max: SvgPerMm
}

/** Roll position held still for the running gesture, and where in the viewport it sits. */
interface Anchor {
    roll: Millimeters
    offset: Svg
}

export interface LiveZoom {
    /**
     * The zoom the drawing is laid out against. It only moves once a
     * gesture has settled, so everything derived from it (hulls, arrow
     * heads, level of detail) is exact whenever the roll is at rest.
     */
    committed: SvgPerMm

    /**
     * Whether a gesture is running. Held in a ref, so that what only needs
     * to know at rest can ask without a render while one does.
     */
    gesturing: RefObject<boolean>

    /** The group carrying the drawing. A running gesture scales it horizontally. */
    stageRef: RefObject<SVGGElement | null>

    /** Attach to the scrolling viewport, held at the same place in the roll while zooming. */
    viewportRef: RefCallback<HTMLDivElement>

    /**
     * That viewport, once it is in the document. Offered as the element
     * itself, so that listeners reach a viewport which only appears later,
     * as soon as there is something to draw.
     */
    viewport: HTMLDivElement | null

    /**
     * Feed a continuous gesture. Cheap enough to call on every pointer move.
     * `focus` is the viewport x held still while zooming, the middle by default.
     */
    scrub: (zoom: SvgPerMm, focus?: Svg) => void

    /** Like `scrub`, but relative to the zoom the gesture started from. */
    scrubBy: (factor: number, focus?: Svg) => void

    /** End the gesture and lay the drawing out again at the zoom last scrubbed to. */
    settle: () => void

    /** Go to a zoom in one step, laying out immediately. */
    jump: (zoom: SvgPerMm) => void
}

/**
 * Horizontal zoom, split into a value the drawing is laid out against and
 * a value the gesture is currently at. While the two differ the difference
 * rides on a single `scale(ratio, 1)` on the stage, which costs one
 * attribute write rather than a re-render of every perforation. Settling
 * folds the ratio back into the layout, so the distortion a non-uniform
 * scale introduces (elliptical hull corners, slanted arrow heads,
 * stretched labels) only ever lasts as long as the gesture.
 */
export const useLiveZoom = (initial: SvgPerMm, range: ZoomRange): LiveZoom => {
    const [committed, setCommitted] = useState(initial)

    const stageRef = useRef<SVGGElement>(null)

    // Held twice over: as a ref for the gesture, which scrolls it without a
    // render, and as state for whatever only reaches it once it is there.
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null)

    const attachViewport = useCallback<RefCallback<HTMLDivElement>>(element => {
        viewportRef.current = element
        setViewport(element)
    }, [])

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
        viewport.scrollLeft = drawnAt(roll, live.current) - offset
    }, [])

    const begin = useCallback((focus?: Svg) => {
        gesturing.current = true
        origin.current = live.current

        const viewport = viewportRef.current
        if (viewport) {
            const offset = focus ?? svg(viewport.clientWidth / 2)
            anchor.current = { roll: placeAt(svg(viewport.scrollLeft + offset), live.current), offset }
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

    const scrub = useCallback((zoom: SvgPerMm, focus?: Svg) => {
        if (!gesturing.current) begin(focus)

        live.current = clamp(zoom, range.min, range.max)
        if (frame.current === undefined) {
            frame.current = requestAnimationFrame(paint)
        }
    }, [begin, paint, range.min, range.max])

    const scrubBy = useCallback((factor: number, focus?: Svg) => {
        if (!gesturing.current) begin(focus)

        scrub(scale(origin.current, factor), focus)
    }, [begin, scrub])

    const settle = useCallback(() => {
        if (frame.current !== undefined) {
            cancelAnimationFrame(frame.current)
            frame.current = undefined
        }
        gesturing.current = false
        setCommitted(live.current)
    }, [])

    const jump = useCallback((zoom: SvgPerMm) => {
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

    return { committed, gesturing, stageRef, viewportRef: attachViewport, viewport, scrub, scrubBy, settle, jump }
}
