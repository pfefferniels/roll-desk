import { range } from 'd3-array'

export type ScaleUnit = 'mm' | 'cm'

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

/**
 * A scale for a roll `length` millimetres long, drawn at `zoom` SVG units
 * per millimetre. The step grows as the roll shrinks, so that two readings
 * never come closer than `spacing`. It reads in centimetres, and in
 * millimetres once a step falls short of one.
 */
export const ruler = (length: number, zoom: number, spacing = closest): Ruler => {
    const step = stepAtLeast(spacing / zoom)
    const unit = unitOf(step.size)

    const labelled = range(0, length, step.size)
        .map(at => ({ at, label: readingOf(at, unit) }))

    const part = step.size / step.parts
    const plain = labelled
        .flatMap(({ at }) => range(1, step.parts).map(nth => at + nth * part))
        .filter(at => at < length)

    return { unit, step: step.size, labelled, plain }
}
