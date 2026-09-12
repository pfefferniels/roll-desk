import { Millimeters, mm, PedalCurve } from "linked-rolls"

/** A place on the roll, and how far the pedal has travelled there, 0 at rest to 1 down. */
export type Vertex = {
    readonly place: Millimeters
    readonly travel: number
}

/** Below this change of travel, as a fraction of the full stroke, a sample adds nothing visible. */
const TOLERANCE = 0.02

/**
 * The samples worth drawing: both ends of every stretch the pedal spends at
 * one position, and along a traversal one sample per `tolerance` of travel.
 */
export const sparseVertices = (
    { place, travel }: Pick<PedalCurve, 'place' | 'travel'>,
    tolerance = TOLERANCE
): Vertex[] => {
    const last = travel.length - 1
    const endsAStretch = (i: number) =>
        i === 0 || i === last || (travel[i] === travel[i - 1]) !== (travel[i] === travel[i + 1])

    const { kept } = [...travel.keys()].reduce(
        ({ kept, anchor }, i) => {
            if (!endsAStretch(i) && Math.abs(travel[i] - anchor) < tolerance) return { kept, anchor }
            kept.push({ place: mm(place[i]), travel: travel[i] })
            return { kept, anchor: travel[i] }
        },
        { kept: [] as Vertex[], anchor: Number.NaN }
    )
    return kept
}

/**
 * The pedal's excursions from rest, cut wherever it lies at rest between
 * two vertices. An excursion the mechanism cannot finish before the roll
 * asks for the next one never reaches rest, so the two stay one piece.
 */
export const episodes = (vertices: readonly Vertex[]): Vertex[][] => {
    const restsAfter = (i: number) => vertices[i].travel === 0 && vertices[i + 1]?.travel === 0
    const cuts = vertices.flatMap((_, i) => restsAfter(i) ? [i + 1] : [])
    const bounds = [0, ...cuts, vertices.length]

    return bounds
        .slice(0, -1)
        .map((start, k) => vertices.slice(start, bounds[k + 1]))
        .filter(piece => piece.some(vertex => vertex.travel > 0))
}
