import { useCallback, useEffect, useRef, useState } from "react"
import { add, inMilliseconds, inSeconds, milliseconds, Seconds, seconds, subtract } from "linked-rolls"
import { MIDIControlEvents } from "midifile-ts"
import { usePiano, type AbsoluteEvent, type Schedule } from "react-pianosound"

const isNote = (event: AbsoluteEvent) =>
    event.type === 'channel' && (event.subtype === 'noteOn' || event.subtype === 'noteOff')

const isSustain = (event: AbsoluteEvent) =>
    event.type === 'channel' && event.subtype === 'controller' && event.controllerType === MIDIControlEvents.SUSTAIN

/** Whether a sustain step holds the dampers off, read as react-pianosound reads it: past the halfway point. */
const holds = (event: AbsoluteEvent) =>
    event.type === 'channel' && event.subtype === 'controller' && event.value > 63

/**
 * The transport second at which a schedule has done sounding: where its
 * last note is released, or, where the sustain pedal holds that note on,
 * where the pedal next lets go.
 *
 * A range narrows the notes while the expression commands of the whole roll
 * are emulated anyway, so the last event of the schedule is a silent one and can
 * lie minutes behind the last note. A whole roll, on the other hand, holds its
 * final chord on the pedal for some seconds after the last note is released.
 */
export const endOf = (schedule: Schedule): Seconds => {
    const { events } = schedule
    const lastNote = events.findLastIndex(isNote)
    const note = events[lastNote]
    if (!note) return seconds(schedule.from)

    const pedal = events.slice(0, lastNote + 1).findLast(isSustain)
    const end = pedal && holds(pedal)
        // A pedal that never lets go holds the note to the end of the schedule.
        ? events.slice(lastNote + 1).find(event => isSustain(event) && !holds(event)) ?? events.at(-1) ?? note
        : note

    return add(inSeconds(milliseconds(end.abs)), seconds(schedule.offset))
}

/**
 * What the piano is playing, if anything, of the version or copy `shown`.
 *
 * The transport is silenced from here and nowhere else, so that the emulation
 * cannot go on sounding under a desk that has turned to something else.
 *
 * react-pianosound reports no end of its own and leaves the transport running
 * past the last event, so the end is read off the schedule, waited for, and
 * the transport silenced there. Left running, it would go on moving the pedals
 * through whatever the schedule holds beyond the end.
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

        const untilEnd = inMilliseconds(subtract(endOf(schedule), seconds(schedule.from)))
        const timer = window.setTimeout(stop, untilEnd)
        return () => window.clearTimeout(timer)
    }, [schedule, stop])

    // An emulation is of one version or copy, and is silenced when the desk leaves it.
    useEffect(() => stop, [shown, stop])

    return {
        isPlaying: schedule !== null,
        /** What `play` scheduled. Nothing plays where it scheduled nothing. */
        started: (schedule: Schedule | null) => setSchedule(schedule),
        stop
    }
}
