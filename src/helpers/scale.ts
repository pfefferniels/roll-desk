import { range } from 'd3-array'
import { add, max, Millimeters, min, mm, scale, subtract } from 'linked-rolls'
import { Svg, svg, SvgPerMm } from './units'

export type ScaleUnit = 'mm' | 'cm'

/** A stretch of roll, both ends measured from its start. */
export interface Span {
    from: Millimeters
    to: Millimeters
}

/**
 * The least span covering all of the given ones. Undefined when none of
 * them is there to be covered, which is how a copy without features
 * reaches nowhere.
 */
export const spanning = (spans: readonly (Span | undefined)[]): Span | undefined =>
    spans.reduce<Span | undefined>((total, span) => {
        if (!span) return total
        if (!total) return span
        return { from: min(total.from, span.from), to: max(total.to, span.to) }
    }, undefined)

/** A span widened at both ends by a fraction of its own reach. */
export const padded = (span: Span, fraction: number): Span => {
    const margin = scale(subtract(span.to, span.from), fraction)
    return { from: subtract(span.from, margin), to: add(span.to, margin) }
}

/** A tick that carries a reading, such as "40 cm". */
export interface LabelledTick {
    /** Distance from the roll's start. */
    at: Millimeters
    label: string
}

/** A scale laid along the roll. */
export interface Ruler {
    unit: ScaleUnit
    /** Distance between two readings. */
    step: Millimeters
    labelled: LabelledTick[]
    /** The plain ticks dividing the steps up. */
    plain: Millimeters[]
}

interface Step {
    size: Millimeters
    /** How many parts the plain ticks divide it into. */
    parts: number
}

/**
 * The steps a ruler is willing to take, each with the number of parts
 * that divides it evenly: a step of two is quartered, the rest fifthed.
 */
const rungs = [
    { factor: 1, parts: 5 },
    { factor: 2, parts: 4 },
    { factor: 5, parts: 5 },
    { factor: 10, parts: 5 }
]

/** The roll is measured to the millimetre, so no ruler goes finer. */
const finest = mm(1)

const stepAtLeast = (wanted: Millimeters): Step => {
    const decade = 10 ** Math.max(0, Math.floor(Math.log10(wanted)))
    const rung = rungs.find(({ factor }) => factor * decade >= wanted) ?? rungs[rungs.length - 1]

    return { size: max(finest, mm(rung.factor * decade)), parts: rung.parts }
}

const unitOf = (step: Millimeters): ScaleUnit => step < 10 ? 'mm' : 'cm'

const readingOf = (at: Millimeters, unit: ScaleUnit) =>
    unit === 'mm' ? `${at} mm` : `${at / 10} cm`

/** How close two readings may come. */
const closest = svg(60)

/** What a ruler is asked for. */
export interface RulerRequest {
    /** How far the roll runs. */
    length: Millimeters

    zoom: SvgPerMm

    /** The stretch to lay ticks over, the whole roll where it is left out. */
    over?: Span

    /** How close two readings may come. */
    spacing?: Svg
}

/** As much of `over` as lies on the roll. */
const onRoll = (length: Millimeters, over?: Span): Span => ({
    from: max(mm(0), over?.from ?? mm(0)),
    to: min(length, over?.to ?? length)
})

/**
 * A scale for a roll `length` millimetres long, drawn at `zoom` SVG units
 * per millimetre. The step grows as the roll shrinks, so that two readings
 * never come closer than `spacing`. It reads in centimetres, and in
 * millimetres once a step falls short of one. Ticks are laid only over
 * `over`, so that what is drawn is bounded by the stretch asked for rather
 * than by the roll.
 */
export const ruler = ({ length, zoom, over, spacing = closest }: RulerRequest): Ruler => {
    const step = stepAtLeast(mm(spacing / zoom))
    const unit = unitOf(step.size)

    const drawn = onRoll(length, over)

    // From the step the stretch begins in, so that its plain ticks are drawn
    // even where its reading lies behind the stretch.
    const steps = range(Math.floor(drawn.from / step.size) * step.size, drawn.to, step.size).map(mm)

    const labelled = steps
        .filter(at => at >= drawn.from)
        .map(at => ({ at, label: readingOf(at, unit) }))

    const part = step.size / step.parts
    const plain = steps
        .flatMap(at => range(1, step.parts).map(nth => mm(at + nth * part)))
        .filter(at => at >= drawn.from && at < drawn.to)

    return { unit, step: step.size, labelled, plain }
}
