import { useCallback, useEffect, useRef, useState } from "react"
import { add, inMilliseconds, inSeconds, milliseconds, Seconds, seconds, subtract } from "linked-rolls"
import { usePiano, type AbsoluteEvent, type Schedule } from "react-pianosound"

const isNote = (event: AbsoluteEvent) =>
    event.type === 'channel' && (event.subtype === 'noteOn' || event.subtype === 'noteOff')

/**
 * The transport second at which a schedule plays its last note.
 *
 * A range narrows the notes while the expression perforations of the whole roll
 * are emulated anyway, so the last event of the schedule is a silent one and can
 * lie minutes behind the last note.
 */
export const lastNoteAt = (schedule: Schedule): Seconds => {
    const lastNote = schedule.events.findLast(isNote)
    if (!lastNote) return seconds(schedule.from)
    return add(inSeconds(milliseconds(lastNote.abs)), seconds(schedule.offset))
}

/**
 * What the piano is playing, if anything, of the version or copy `shown`.
 *
 * The transport is silenced from here and nowhere else, so that the emulation
 * cannot go on sounding under a desk that has turned to something else.
 *
 * react-pianosound reports no end of its own and leaves the transport running
 * past the last event, so the end is read off the schedule and waited for.
 */
export const usePlayback = (shown: string | undefined) => {
    const { stop: stopPiano } = usePiano()
    const [schedule, setSchedule] = useState<Schedule | null>(null)

    // usePiano hands out a fresh `stop` per render, which no effect may re-run for.
    const latestStop = useRef(stopPiano)
    useEffect(() => { latestStop.current = stopPiano })

    const stop = useCallback(() => {
        latestStop.current()
        setSchedule(null)
    }, [])

    useEffect(() => {
        if (!schedule) return

        const untilLastNote = inMilliseconds(subtract(lastNoteAt(schedule), seconds(schedule.from)))
        const timer = window.setTimeout(() => setSchedule(null), untilLastNote)
        return () => window.clearTimeout(timer)
    }, [schedule])

    // An emulation is of one version or copy, and is silenced when the desk leaves it.
    useEffect(() => stop, [shown, stop])

    return {
        isPlaying: schedule !== null,
        /** What `play` scheduled. Nothing plays where it scheduled nothing. */
        started: (schedule: Schedule | null) => setSchedule(schedule),
        stop
    }
}
