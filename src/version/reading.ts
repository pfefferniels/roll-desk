import { DynamicsCurve, Millimeters } from "linked-rolls"
import { Svg, svg } from "../canvas/units"

/**
 * The velocity a curve stands at in a place on the paper: that of the
 * sample nearest to it, which is the one the emulator strikes a note
 * with whose onset lies there. Nothing off either end of the curve.
 */
export const velocityAt = (
    { place, velocity }: Pick<DynamicsCurve, 'place' | 'velocity'>,
    at: Millimeters
): number | undefined => {
    const first = place[0]
    const last = place.at(-1)
    if (first === undefined || last === undefined || at < first || at > last) return undefined

    // The first sample not before the place, the samples running along the paper.
    let low = 0
    let high = place.length
    while (low < high) {
        const middle = (low + high) >> 1
        if ((place[middle] ?? Infinity) < at) low = middle + 1
        else high = middle
    }

    const after = place[low] ?? Infinity
    const before = place[low - 1] ?? -Infinity
    return velocity[at - before < after - at ? low - 1 : low]
}

/**
 * Where readings are written beside one whisker, each level with the
 * curve it reads unless that brings two closer than a line apart. Those
 * are pushed apart in the order the curves stand, the louder above, and
 * lifted back by half as far, so that a pair stays centred on the curves.
 */
export const keptApart = (ys: readonly Svg[], line: Svg): Svg[] => {
    const order = ys.map((_, i) => i).sort((a, b) => (ys[a] ?? 0) - (ys[b] ?? 0))

    const pushed: number[] = [...ys]
    let previous = -Infinity
    for (const i of order) {
        previous = Math.max(ys[i] ?? 0, previous + line)
        pushed[i] = previous
    }

    const last = order.at(-1)
    const lift = last === undefined ? 0 : ((pushed[last] ?? 0) - (ys[last] ?? 0)) / 2
    return pushed.map(y => svg(y - lift))
}
