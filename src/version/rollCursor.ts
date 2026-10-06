import { RefCallback, useCallback, useState } from 'react'
import { Certainty, Millimeters, subtract } from 'linked-rolls'
import { scrollBehavior } from '../desk/motion'

/**
 * Something the keyboard's cursor stops at on the roll, a symbol or an
 * edit: where it begins along the roll, and how high it is drawn.
 */
export interface Stop {
    id: string
    from: Millimeters
    y: number
}

/**
 * The stops in the order the cursor takes them: along the roll, and
 * where two begin together, as a chord is read from the top down.
 */
export const inRollOrder = <S extends Stop>(stops: readonly S[]): S[] =>
    [...stops].sort((a, b) => (a.from - b.from) || (a.y - b.y))

/** How the cursor moves: to the stop before or after it, a view further, or to the first or last stop. */
export type Step = 'next' | 'previous' | 'pageNext' | 'pagePrevious' | 'first' | 'last'

/** Where the cursor stands: on a stop, or where it was last, on a stop of another kind. */
export interface Standing {
    id: string
    at: Millimeters
}

/** The stretch of the roll the view shows. */
export interface Shown {
    from: Millimeters
    to: Millimeters
}

/**
 * The stop the cursor goes to, in stops kept in roll order. Standing on
 * one of them, it goes to the one before or after; standing on a stop of
 * another kind, as a symbol is to an edit, to the first one from there on
 * or the last one before. A page goes as far again as the view is wide.
 * Where the cursor stands nowhere yet, it starts at the first stop the
 * view shows, so that the first key says where the reader is. Nothing
 * where there is nowhere further to go.
 */
export const stepIn = <S extends Stop>(
    stops: readonly S[],
    step: Step,
    standing: Standing | undefined,
    shown: Shown
): S | undefined => {
    if (step === 'first') return stops[0]
    if (step === 'last') return stops.at(-1)

    if (!standing) return stops.find(stop => stop.from >= shown.from) ?? stops.at(-1)

    if (step === 'pageNext' || step === 'pagePrevious') {
        const width = shown.to - shown.from
        const target = standing.at + (step === 'pageNext' ? width : -width)
        return step === 'pageNext'
            ? stops.find(stop => stop.from >= target) ?? stops.at(-1)
            : stops.findLast(stop => stop.from <= target) ?? stops[0]
    }

    const at = stops.findIndex(stop => stop.id === standing.id)
    if (at !== -1) return stops[step === 'next' ? at + 1 : at - 1]

    return step === 'next'
        ? stops.find(stop => stop.from >= standing.at)
        : stops.findLast(stop => stop.from < standing.at)
}

/** A place along the roll as the ruler reads it, in centimetres from its start. */
export const placeWords = (at: Millimeters) => `${(at / 10).toFixed(1)} cm`

/** A length on the roll in millimetres, as small as a perforation runs. */
export const lengthWords = (length: Millimeters) => `${length.toFixed(1)} mm`

/** What a symbol is, as the cursor says it. */
export interface SpokenSymbol {
    /** What its lane means on the bar, as the label at the edge of the view writes it. */
    meaning: string
    track: number
    from: Millimeters
    to: Millimeters
    /** Whether this version inserted it, which a version with a parent says. */
    inserted: boolean
    /** How far apart its carriers set in, where they disagree. */
    spread?: Millimeters
    /** The velocity it is struck with, and with which in the version this derives from. */
    velocity?: { own: number, before?: { siglum: string, velocity: number } }
}

/**
 * What the cursor says of a symbol: what its lane means and where, how
 * long it is, how far its copies disagree on its onset, whether this
 * version put it there, and the velocity it is struck with, all that the
 * pointer reads off the roll.
 */
export const symbolWords = ({ meaning, track, from, to, inserted, spread, velocity }: SpokenSymbol): string => [
    `${meaning}, track ${track}`,
    `at ${placeWords(from)}`,
    `${lengthWords(subtract(to, from))} long`,
    spread !== undefined && spread >= 0.05 && `onsets ${lengthWords(spread)} apart`,
    inserted && 'inserted by this version',
    velocity && `velocity ${velocity.own.toFixed(1)}${velocity.before
        ? ` (${velocity.before.siglum}: ${velocity.before.velocity.toFixed(1)})`
        : ''}`
].filter(Boolean).join(', ')

/** What an edit is, as the cursor says it. */
export interface SpokenEdit {
    from: Millimeters
    /** Its type, in words. */
    type?: string
    inserted: number
    deleted: number
    certainty?: Certainty
    /** What the motivation it is held under says. */
    motivation?: string
}

const symbols = (count: number) => `${count} symbol${count === 1 ? '' : 's'}`

/** What an edit does, as a count of what it inserts and deletes. */
const doneBy = (inserted: number, deleted: number) => {
    if (inserted && deleted) return `inserts ${symbols(inserted)}, deletes ${deleted}`
    if (inserted) return `inserts ${symbols(inserted)}`
    return `deletes ${symbols(deleted)}`
}

/** What the cursor says of an edit: where it lies, what it does, how certainly it is held, and why it was made. */
export const editWords = ({ from, type, inserted, deleted, certainty, motivation }: SpokenEdit): string => {
    const said = [
        `Edit at ${placeWords(from)}`,
        type,
        doneBy(inserted, deleted),
        certainty && `held ${certainty}`
    ].filter(Boolean).join(', ')
    return motivation ? `${said}. ${motivation}` : said
}

const eventName = 'roll-cursor'

/** Tells the group drawn for a symbol that the keyboard's cursor has come to it, or has left it. */
export const tellCursor = (symbolId: string, on: boolean) =>
    document.getElementById(symbolId)?.dispatchEvent(new CustomEvent<boolean>(eventName, { detail: on }))

/**
 * Whether the keyboard's cursor stands on this symbol. Told through the
 * group drawn for it, as playback is, so that moving the cursor redraws
 * the two symbols it leaves and comes to rather than the whole roll.
 */
export const useRollCursor = () => {
    const [cursor, setCursor] = useState(false)

    const followCursor: RefCallback<SVGGElement> = useCallback(node => {
        if (!node) return

        const tell = (e: CustomEvent<boolean>) => setCursor(e.detail)
        node.addEventListener(eventName, tell as EventListener)
        return () => node.removeEventListener(eventName, tell as EventListener)
    }, [])

    return { cursor, followCursor }
}

/** How far inside the view's edge the cursor is kept. */
const cursorMargin = 40

/** Brings what the cursor stands on into the middle of the view, where it is not well inside it already. */
export const bringIntoView = (shape: Element | null, viewport: Element | null) => {
    if (!shape || !viewport) return

    const view = viewport.getBoundingClientRect()
    const box = shape.getBoundingClientRect()
    const inside = box.left >= view.left + cursorMargin && box.right <= view.right - cursorMargin
        && box.top >= view.top && box.bottom <= view.bottom
    if (inside) return

    shape.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest', inline: 'center' })
}
