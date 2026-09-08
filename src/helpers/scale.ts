import { range } from 'd3-array'

export type ScaleUnit = 'mm' | 'cm'

/** A stretch of roll, both ends measured from its start in millimetres. */
export interface Span {
    from: number
    to: number
}

/** A tick that carries a reading, such as "40 cm". */
export interface LabelledTick {
    /** Distance from the roll's start, in millimetres. */
    at: number
    label: string
}

/** A scale laid along the roll, every distance in millimetres. */
export interface Ruler {
    unit: ScaleUnit
    /** Distance between two readings. */
    step: number
    labelled: LabelledTick[]
    /** The plain ticks dividing the steps up. */
    plain: number[]
}

interface Step {
    /** In millimetres. */
    size: number
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
const finest = 1

const stepAtLeast = (wanted: number): Step => {
    const decade = 10 ** Math.max(0, Math.floor(Math.log10(wanted)))
    const rung = rungs.find(({ factor }) => factor * decade >= wanted) ?? rungs[rungs.length - 1]

    return { size: Math.max(finest, rung.factor * decade), parts: rung.parts }
}

const unitOf = (step: number): ScaleUnit => step < 10 ? 'mm' : 'cm'

const readingOf = (at: number, unit: ScaleUnit) =>
    unit === 'mm' ? `${at} mm` : `${at / 10} cm`

/** How close two readings may come, in SVG units. */
const closest = 60

/** What a ruler is asked for. */
export interface RulerRequest {
    /** How far the roll runs, in millimetres. */
    length: number

    /** SVG units per millimetre. */
    zoom: number

    /** The stretch to lay ticks over, the whole roll where it is left out. */
    over?: Span

    /** How close two readings may come, in SVG units. */
    spacing?: number
}

/** As much of `over` as lies on the roll. */
const onRoll = (length: number, over?: Span): Span => ({
    from: Math.max(0, over?.from ?? 0),
    to: Math.min(length, over?.to ?? length)
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
    const step = stepAtLeast(spacing / zoom)
    const unit = unitOf(step.size)

    const drawn = onRoll(length, over)

    // From the step the stretch begins in, so that its plain ticks are drawn
    // even where its reading lies behind the stretch.
    const steps = range(Math.floor(drawn.from / step.size) * step.size, drawn.to, step.size)

    const labelled = steps
        .filter(at => at >= drawn.from)
        .map(at => ({ at, label: readingOf(at, unit) }))

    const part = step.size / step.parts
    const plain = steps
        .flatMap(at => range(1, step.parts).map(nth => at + nth * part))
        .filter(at => at >= drawn.from && at < drawn.to)

    return { unit, step: step.size, labelled, plain }
}
