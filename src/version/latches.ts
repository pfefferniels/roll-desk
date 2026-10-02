import { Expression, Millimeters, NegotiatedEvent, TrackerBar } from "linked-rolls"

type Performed = NegotiatedEvent & Expression

const isExpression = (event: NegotiatedEvent): event is Performed => event.type === 'expression'

/** A function latched on, from the command that turns it on to the one that cancels it. */
interface Latch {
    on: Performed
    from: Millimeters
    /** Where the function is cancelled, or nothing where the roll leaves it on to its end. */
    to?: Millimeters
}

/**
 * The stretches of roll over which a bar keeps a function on: from a
 * command that latches it to the next that cancels it on the same line,
 * the side counting where the bar says it does. A second On while the
 * function already stands changes nothing, the stretch beginning at the
 * first. A held command latches nothing, being in force only as long as
 * its perforation lasts.
 */
export const latchesOf = (events: readonly NegotiatedEvent[], bar: TrackerBar): Latch[] => {
    const standing = new Map<string, Latch>()
    const latches: Latch[] = []

    for (const event of events.filter(isExpression).toSorted((a, b) => a.horizontal.from - b.horizontal.from)) {
        const operation = bar.operationOf(event.expressionType)
        if (!operation || operation.spelling === 'held') continue

        const key = operation.sided ? `${operation.operates} ${event.scope}` : operation.operates
        const latch = standing.get(key)

        if (operation.spelling === 'on' && !latch) {
            const latched = { on: event, from: event.horizontal.from }
            standing.set(key, latched)
            latches.push(latched)
        }
        else if (operation.spelling === 'off' && latch) {
            latch.to = event.horizontal.from
            standing.delete(key)
        }
    }

    return latches
}

/**
 * The commands whose functions stand at a place on the roll: latched
 * there or before, and not cancelled yet. A function cancelled at the
 * place itself no longer stands.
 */
export const latchedAt = (latches: readonly Latch[], at: Millimeters): Performed[] =>
    latches
        .filter(({ from, to }) => from <= at && (to === undefined || at < to))
        .map(({ on }) => on)
