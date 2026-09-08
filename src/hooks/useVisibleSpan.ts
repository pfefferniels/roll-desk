import { useEffect, useState } from 'react'
import { Span } from '../helpers/scale'
import { usePinchZoom } from './usePinchZoom'

/** As much of a scrolling element as it takes to say what it shows. */
interface Viewport {
    scrollLeft: number
    clientWidth: number
}

/** How far the view moves, in viewport widths, before the stretch is taken again. */
const grain = 0.5

/** Viewport widths of roll held ready on either side of the view. */
const slack = 1

/**
 * The stretch of roll a viewport shows at `zoom` SVG units per millimetre,
 * with the slack around it. Where the view sits is read in steps of
 * `grain`, so that scrolling asks for the same stretch again until it has
 * moved on.
 */
export const spanShown = (viewport: Viewport, zoom: number): Span => {
    const width = viewport.clientWidth / zoom
    const at = Math.floor(viewport.scrollLeft / viewport.clientWidth / grain) * grain

    return { from: (at - slack) * width, to: (at + 1 + grain + slack) * width }
}

const same = (one: Span | undefined, other: Span) =>
    one?.from === other.from && one?.to === other.to

/**
 * The stretch of roll on screen, and nothing while there is no viewport to
 * read it from, which leaves a caller to fall back on the whole roll. It
 * stands still while a zoom gesture runs: the drawing is then only being
 * scaled, so the scroll position no longer belongs to the layout the
 * stretch is measured in. The slack carries the gesture until it settles
 * and the stretch is taken again.
 */
export const useVisibleSpan = (): Span | undefined => {
    const { viewport, zoom, gesturing } = usePinchZoom()
    const [span, setSpan] = useState<Span>()

    useEffect(() => {
        if (!viewport) return

        const measure = () => {
            if (gesturing.current || !viewport.clientWidth) return

            const shown = spanShown(viewport, zoom)
            setSpan(previous => same(previous, shown) ? previous : shown)
        }

        const listeners = new AbortController()
        viewport.addEventListener('scroll', measure, { passive: true, signal: listeners.signal })

        const sizes = new ResizeObserver(measure)
        sizes.observe(viewport)

        measure()

        return () => {
            listeners.abort()
            sizes.disconnect()
        }
    }, [viewport, zoom, gesturing])

    return span
}
