import { RefObject, useEffect, useRef } from 'react'

export interface PinchHandlers {
    /** The pinch stands at `factor` times where it began, centred on viewport x `focus`. */
    onPinch: (factor: number, focus: number) => void

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

const spreadOf = (touches: TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

const middleOf = (touches: TouchList) => (touches[0].clientX + touches[1].clientX) / 2

/**
 * Listens for pinches on `viewport`: two fingers on a touch screen, or two
 * on a trackpad, which Chrome and Firefox report as wheel events with the
 * control key held and Safari through gesture events. A pinch is reported
 * as a factor relative to where it began, so whatever it drives multiplies
 * through from its own starting point.
 */
export const usePinchGesture = (viewport: RefObject<HTMLElement | null>, handlers: PinchHandlers) => {
    const latest = useRef(handlers)
    latest.current = handlers

    useEffect(() => {
        const element = viewport.current
        if (!element) return

        let factor = 1
        let quiet: number | undefined
        let inGestureEvents = false
        let initialSpread: number | undefined

        const pinch = (to: number, clientX: number) => {
            factor = to
            latest.current.onPinch(factor, clientX - element.getBoundingClientRect().left)
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
            if (e.touches.length !== 2) return
            initialSpread = spreadOf(e.touches)
        }

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 2 || initialSpread === undefined) return
            e.preventDefault()
            pinch(spreadOf(e.touches) / initialSpread, middleOf(e.touches))
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
    }, [viewport])
}
