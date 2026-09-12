import { describe, expect, it } from 'vitest'
import { mm } from 'linked-rolls'
import { episodes, sparseVertices, Vertex } from './pedalEnvelope'

const curveOf = (travel: number[]) => ({
    travel: Float64Array.from(travel),
    place: Float64Array.from(travel, (_, i) => i)
})

/** `steps` samples strictly between `from` and `to`, so the rails stay with the stretches. */
const ramp = (from: number, to: number, steps: number) =>
    Array.from({ length: steps }, (_, i) => from + ((to - from) * (i + 1)) / (steps + 1))

const rest = (length: number) => Array(length).fill(0)
const held = (length: number) => Array(length).fill(1)

const at = (travel: number[]) => travel.map((value, place) => ({ place: mm(place), travel: value }))

describe('sparse vertices', () => {
    const curve = curveOf([...rest(4), ...ramp(0, 1, 50), ...held(6), ...ramp(1, 0, 50), ...rest(4)])
    const vertices = sparseVertices(curve)

    it('keeps the first and last sample', () => {
        expect(vertices[0]).toEqual({ place: 0, travel: 0 })
        expect(vertices[vertices.length - 1]).toEqual({ place: curve.travel.length - 1, travel: 0 })
    })

    it('keeps both ends of every stretch at one position and nothing in between', () => {
        const places = vertices.map(vertex => vertex.place)
        expect(places).toContain(3)
        expect(places).toContain(54)
        expect(places).toContain(59)
        expect(places).toContain(110)
        expect(places.filter(place => place > 0 && place < 3)).toEqual([])
        expect(places.filter(place => place > 54 && place < 59)).toEqual([])
    })

    it('thins a traversal to steps of at least the tolerance', () => {
        const alongTheRise = vertices.filter(vertex => vertex.place > 3 && vertex.place < 54)
        alongTheRise.slice(1).forEach((vertex, i) => {
            expect(vertex.travel - alongTheRise[i].travel).toBeGreaterThanOrEqual(0.02 - 1e-12)
        })
        expect(alongTheRise.length).toBeLessThan(50)
        expect(alongTheRise.length).toBeGreaterThan(10)
    })
})

describe('episodes', () => {
    it('cuts at every rest and leaves the rests out', () => {
        const vertices: Vertex[] = at([0, 0, 0.5, 1, 1, 0.5, 0, 0, 0.5, 1, 0.5, 0, 0])
        const pieces = episodes(vertices)
        expect(pieces.map(piece => piece.map(vertex => vertex.place))).toEqual([
            [1, 2, 3, 4, 5, 6],
            [7, 8, 9, 10, 11]
        ])
    })

    it('starts and ends every piece where the pedal rests', () => {
        const pieces = episodes(at([0, 0, 0.5, 1, 0.5, 0, 0]))
        pieces.forEach(piece => {
            expect(piece[0].travel).toEqual(0)
            expect(piece[piece.length - 1].travel).toEqual(0)
        })
    })

    it('keeps an unfinished lift in one piece with the retake', () => {
        const pieces = episodes(at([0, 0, 0.5, 1, 0.6, 0.3, 0.7, 1, 0.5, 0, 0]))
        expect(pieces).toHaveLength(1)
        expect(pieces[0].map(vertex => vertex.place)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it('yields nothing for a pedal that never moves', () => {
        expect(episodes(at([0, 0, 0]))).toEqual([])
    })
})
