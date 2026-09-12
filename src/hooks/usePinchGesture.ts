import { useEffect, useLayoutEffect, useRef } from 'react'
import { Svg, svg } from '../helpers/units'

export interface PinchHandlers {
    /** The pinch stands at `factor` times where it began, centred on viewport x `focus`. */
    onPinch: (factor: number, focus: Svg) => void

    /** The fingers have lifted, or the wheel has gone quiet. */
    onEnd: () => void
}

/** Safari reports a trackpad pinch through these non-standard events. */
interface GestureEvent extends UIEvent {
    scale: number
    clientX: number
}

/** A wheel that stays silent this long has finished its pinch. */
const wheelQuiet = 200

const pixelsPerUnit = (deltaMode: number) => {
    switch (deltaMode) {
        case WheelEvent.DOM_DELTA_LINE: return 16
        case WheelEvent.DOM_DELTA_PAGE: return 800
        default: return 1
    }
}

// A mouse wheel notch comes in hundreds where a trackpad pinch moves in
// single digits, so one notch is held to a modest step.
const wheelStep = (e: WheelEvent) => {
    const step = Math.exp(-e.deltaY * pixelsPerUnit(e.deltaMode) / 100)
    return Math.min(1.5, Math.max(2 / 3, step))
}

/** The two fingers of a pinch, or nothing where there are not two. */
const pinchedBy = (touches: TouchList) => {
    const [one, other] = [touches[0], touches[1]]
    return one && other ? { one, other } : undefined
}

const spreadOf = ({ one, other }: Pinch) =>
    Math.hypot(one.clientX - other.clientX, one.clientY - other.clientY)

const middleOf = ({ one, other }: Pinch) => (one.clientX + other.clientX) / 2

type Pinch = NonNullable<ReturnType<typeof pinchedBy>>

/**
 * Listens for pinches on `element`: two fingers on a touch screen, or two
 * on a trackpad, which Chrome and Firefox report as wheel events with the
 * control key held and Safari through gesture events. A pinch is reported
 * as a factor relative to where it began, so whatever it drives multiplies
 * through from its own starting point. Takes the element rather than a ref
 * to it, so that an element mounted later is listened to as well.
 */
export const usePinchGesture = (element: HTMLElement | null, handlers: PinchHandlers) => {
    const latest = useRef(handlers)
    useLayoutEffect(() => { latest.current = handlers })

    useEffect(() => {
        if (!element) return

        let factor = 1
        let quiet: number | undefined
        let inGestureEvents = false
        let initialSpread: number | undefined

        const pinch = (to: number, clientX: number) => {
            factor = to
            latest.current.onPinch(factor, svg(clientX - element.getBoundingClientRect().left))
        }

        const end = () => {
            factor = 1
            latest.current.onEnd()
        }

        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey) return
            e.preventDefault()
            if (inGestureEvents) return

            pinch(factor * wheelStep(e), e.clientX)
            window.clearTimeout(quiet)
            quiet = window.setTimeout(end, wheelQuiet)
        }

        const onGestureStart = (e: GestureEvent) => {
            e.preventDefault()
            inGestureEvents = true
        }

        const onGestureChange = (e: GestureEvent) => {
            e.preventDefault()
            pinch(e.scale, e.clientX)
        }

        const onGestureEnd = (e: GestureEvent) => {
            e.preventDefault()
            inGestureEvents = false
            end()
        }

        const onTouchStart = (e: TouchEvent) => {
            const pinched = pinchedBy(e.touches)
            if (!pinched) return
            initialSpread = spreadOf(pinched)
        }

        const onTouchMove = (e: TouchEvent) => {
            const pinched = pinchedBy(e.touches)
            if (!pinched || initialSpread === undefined) return
            e.preventDefault()
            pinch(spreadOf(pinched) / initialSpread, middleOf(pinched))
        }

        const onTouchEnd = (e: TouchEvent) => {
            if (initialSpread === undefined || e.touches.length >= 2) return
            initialSpread = undefined
            end()
        }

        element.addEventListener('wheel', onWheel, { passive: false })
        element.addEventListener('gesturestart', onGestureStart as EventListener)
        element.addEventListener('gesturechange', onGestureChange as EventListener)
        element.addEventListener('gestureend', onGestureEnd as EventListener)
        element.addEventListener('touchstart', onTouchStart)
        element.addEventListener('touchmove', onTouchMove, { passive: false })
        element.addEventListener('touchend', onTouchEnd)
        element.addEventListener('touchcancel', onTouchEnd)

        return () => {
            window.clearTimeout(quiet)
            element.removeEventListener('wheel', onWheel)
            element.removeEventListener('gesturestart', onGestureStart as EventListener)
            element.removeEventListener('gesturechange', onGestureChange as EventListener)
            element.removeEventListener('gestureend', onGestureEnd as EventListener)
            element.removeEventListener('touchstart', onTouchStart)
            element.removeEventListener('touchmove', onTouchMove)
            element.removeEventListener('touchend', onTouchEnd)
            element.removeEventListener('touchcancel', onTouchEnd)
        }
    }, [element])
}
