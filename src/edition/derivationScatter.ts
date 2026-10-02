import {
    admits, admittedAtEnds, BothEnds, CollationTolerance, collationToleranceOf, Edition, Millimeters, mm,
    offsetEndOf, offsetStartOf, principalDerivationOf, readingsOf, Scatter, scatterOf, sidesOf, snapshotOf, versionIn
} from "linked-rolls"

/** One kind of symbol as the copies on either side of a derivation place it. */
export interface Sample {
    scatter: Scatter

    /** Where the readings lie that the window does not admit, at either end taken apart. */
    outside: BothEnds<Millimeters[]>
}

/** How far the copies on either side of a derivation disagree, against the window it was collated in. */
export interface DerivationScatter {
    /** The window in force, the default where the derivation states none. */
    window: CollationTolerance

    /** The copies bearing what the version inserts, whose readings are measured against the rest. */
    copies: string[]

    /** One sample per kind of symbol, the notes first. */
    samples: Sample[]

    /** How many readings the window does not admit at one end or both, which a collation at it would have taken apart. */
    outside: number
}

const ORDER = ['note', 'expression', 'text']

const rankOf = (group: string): number => {
    const rank = ORDER.indexOf(group)
    return rank === -1 ? ORDER.length : rank
}

/**
 * How the copies on the version's side of its principal derivation put
 * each symbol it shares with the other side, against where the other
 * side puts it, and the window that judged them.
 *
 * The sides are read off the edits, as the library has it, and the
 * displacement runs child less parent, the direction the window is
 * stated in. So the window drawn over these readings sits where the
 * collation applied it, and a calculated window drawn from the same
 * readings lands on the one the derivation states.
 *
 * What the window took apart is no reading any more: two readings it
 * separated are two symbols, each borne by one side. The sample is
 * therefore cut at the window's edges, and a curve running out past
 * them is the sign that it cut into the scatter rather than round it.
 *
 * Nothing where the version derives from nothing, or where its
 * derivation inserts and strikes nothing and so names no side.
 */
export const derivationScatterOf = (edition: Edition, versionId: string): DerivationScatter | undefined => {
    const version = versionIn(edition, versionId)
    const principal = version && principalDerivationOf(version)
    const sides = sidesOf(edition, versionId)
    if (!principal || !sides || sides.child.length === 0) return undefined

    const window = collationToleranceOf(principal)
    const copies = sides.child.map(attested => attested.copy)
    const readings = readingsOf(edition, snapshotOf(edition, versionId), new Set(copies))
    const samples = scatterOf(readings)
        .sort((a, b) => rankOf(a.group) - rankOf(b.group))
        .map(scatter => {
            const ends = readings
                .filter(reading => reading.symbol.type === scatter.group)
                .map(({ displacement }) => ({ displacement, admitted: admittedAtEnds(window, displacement) }))
            const outsideAt = (end: keyof BothEnds<unknown>) => ends
                .filter(({ admitted }) => !admitted[end])
                .map(({ displacement }) => displacement[end])
            return { scatter, outside: { from: outsideAt('from'), to: outsideAt('to') } }
        })
    if (samples.length === 0) return undefined

    return {
        window,
        copies,
        samples,
        outside: readings.filter(reading => !admits(window, reading.displacement)).length
    }
}

/** Where the window at one end is centred and how far it reaches. */
export const windowAt = (window: CollationTolerance, end: keyof BothEnds<unknown>): { centre: Millimeters, reach: Millimeters } =>
    end === 'from'
        ? { centre: offsetStartOf(window), reach: window.toleranceStart }
        : { centre: offsetEndOf(window), reach: window.toleranceEnd }

/**
 * The stretch of displacement every sample of the derivation is drawn
 * across, at both ends, so that one plot can be laid beside another:
 * every bin and the window, with a little room either side.
 */
export const extentOf = ({ window, samples }: DerivationScatter, margin: Millimeters = mm(0.5)): [Millimeters, Millimeters] => {
    const ends = ['from', 'to'] as const
    const bounds = ends.flatMap(end => {
        const { centre, reach } = windowAt(window, end)
        return [
            centre - reach,
            centre + reach,
            ...samples.flatMap(({ scatter }) => scatter.histogram[end].edges)
        ]
    })
    return [mm(Math.min(...bounds) - margin), mm(Math.max(...bounds) + margin)]
}

/** How many readings the normal curve fitted to the histogram expects to fall into a bin at the displacement. */
export const curveAt = ({ centre, sigma, area }: Scatter['histogram']['from']['curve'], x: number): number =>
    area / (sigma * Math.sqrt(2 * Math.PI)) * Math.exp(-(((x - centre) / sigma) ** 2) / 2)

/**
 * Where to mark the axis: whole millimetres, spaced so that some five
 * or six marks fall across the stretch.
 */
export const ticksAcross = ([low, high]: [number, number]): number[] => {
    const span = high - low
    const step = [1, 2, 5, 10].find(step => span / step <= 7) ?? 20
    const first = Math.ceil(low / step) * step
    return Array.from({ length: Math.floor((high - first) / step) + 1 }, (_, i) => first + i * step)
}
