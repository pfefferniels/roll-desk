import { DateAssignment, dateOf, earliestOf, latestOf } from 'linked-rolls'

const day = (date: Date) => new Intl.DateTimeFormat().format(date)

/**
 * What a date states, as a line: the day it falls within, or the bounds
 * it lies between. A bound nobody can give is left out, which is what
 * "not before" and "not after" say.
 */
export const dateStatement = (date: DateAssignment): string => {
    const within = dateOf(date)
    if (within) return day(within)

    const earliest = earliestOf(date)
    const latest = latestOf(date)
    if (earliest && latest) return `${day(earliest)} to ${day(latest)}`
    if (earliest) return `not before ${day(earliest)}`
    if (latest) return `not after ${day(latest)}`
    return 'no date'
}
