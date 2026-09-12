import { RefCallback, useCallback, useState } from 'react'
import { Milliseconds } from 'linked-rolls'

const eventName = 'playback-event'

/** What playback tells the group drawn for a symbol when it reaches it. */
interface Reached {
    /** How long the symbol stays marked. */
    milliseconds: Milliseconds
}

/** Announces playback on the shape drawn for `symbolId`, if there is one. */
export const announcePlayback = (symbolId: string, milliseconds: Milliseconds) => {
    const group = document.getElementById(symbolId)
    group?.dispatchEvent(new CustomEvent<Reached>(eventName, { detail: { milliseconds } }))
}

/**
 * Whether playback is standing on this symbol. The mark expires on its own,
 * so it also goes away when playback is stopped half-way through.
 */
export const usePlaybackMark = () => {
    const [marked, setMarked] = useState(false)

    const followPlayback: RefCallback<SVGGElement> = useCallback(node => {
        if (!node) return

        let expiry = 0
        const mark = (e: CustomEvent<Reached>) => {
            setMarked(true)
            window.clearTimeout(expiry)
            expiry = window.setTimeout(() => setMarked(false), e.detail.milliseconds)
        }

        node.addEventListener(eventName, mark as EventListener)
        return () => {
            window.clearTimeout(expiry)
            node.removeEventListener(eventName, mark as EventListener)
        }
    }, [])

    return { marked, followPlayback }
}
