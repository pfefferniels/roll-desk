import { useEffect, useState } from "react"
import type { AbsoluteEvent, Schedule } from "react-pianosound"

const isNote = (event: AbsoluteEvent) =>
    event.type === 'channel' && (event.subtype === 'noteOn' || event.subtype === 'noteOff')

/**
 * The transport second at which a schedule plays its last note.
 *
 * A range narrows the notes while the expression perforations of the whole roll
 * are emulated anyway, so the last event of the schedule is a silent one and can
 * lie minutes behind the last note.
 */
export const lastNoteAt = (schedule: Schedule) => {
    const lastNote = schedule.events.findLast(isNote)
    return lastNote ? lastNote.abs / 1000 + schedule.offset : schedule.from
}

/**
 * What the piano is playing, if anything.
 *
 * react-pianosound reports no end of its own and leaves the transport running
 * past the last event, so the end is read off the schedule and waited for.
 */
export const usePlayback = () => {
    const [schedule, setSchedule] = useState<Schedule | null>(null)

    useEffect(() => {
        if (!schedule) return

        const untilLastNote = (lastNoteAt(schedule) - schedule.from) * 1000
        const timer = window.setTimeout(() => setSchedule(null), untilLastNote)
        return () => window.clearTimeout(timer)
    }, [schedule])

    return {
        isPlaying: schedule !== null,
        /** What `play` scheduled. Nothing plays where it scheduled nothing. */
        started: (schedule: Schedule | null) => setSchedule(schedule),
        stopped: () => setSchedule(null)
    }
}
