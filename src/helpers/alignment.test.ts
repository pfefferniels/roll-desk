import { describe, expect, it } from 'vitest'
import { Alignment, HoleChain, mm, percent, RollCopy, track } from 'linked-rolls'
import { alignmentStatement, asPercent, inPpm, movesBy, problemStatement, strainStatement } from './alignment'

const by = (shift: number, scale: number, rest: Partial<Alignment> = {}): Alignment =>
    ({ shift: { horizontal: mm(shift), vertical: track(0) }, scale, ...rest })

/** A copy whose two notes stand at 100 and 1000 mm of its own paper, put on the axis by the alignment. */
const copyAlignedBy = (alignment: Alignment): RollCopy => {
    const onAxis = (place: number) => mm((place + alignment.shift.horizontal) * alignment.scale)
    const holes: HoleChain[] = [100, 1000].map((place, i) => ({
        type: 'HoleChain',
        id: `hole-${i}`,
        horizontal: { unit: 'mm', from: onAxis(place), to: onAxis(place + 5) },
        vertical: { unit: 'track', from: track(47) }
    }))
    return {
        type: 'RollCopy', id: 'copy', conditions: [], modifications: [],
        measurements: { alignment },
        production: { produced: holes }
    }
}

describe('a factor read as a percentage', () => {
    it('keeps no more digits than were meant', () => {
        expect(asPercent(1.0023)).toBe('100.23 %')
        expect(asPercent(0.99765)).toBe('99.77 %')
    })
})

describe('a strain put into words', () => {
    it('gives its sign and its uncertainty', () => {
        expect(strainStatement({ value: percent(0.2021), uncertainty: percent(0.137), unit: 'percent' })).toBe('+0.20 ± 0.14 %')
        expect(strainStatement({ value: percent(-0.018), uncertainty: percent(0.14), unit: 'percent' })).toBe('−0.02 ± 0.14 %')
    })

    it('gives no sign to a strain that rounds to nothing', () => {
        expect(strainStatement({ value: percent(-0.0000001), uncertainty: percent(0.19), unit: 'percent' })).toBe('0.00 ± 0.19 %')
    })

    it('gives the value alone where no uncertainty was stated', () => {
        expect(strainStatement({ value: percent(0.5), unit: 'percent' })).toBe('+0.50 %')
    })
})

describe('an alignment put into words', () => {
    it('gives the numbers, and how well they rest where it knows', () => {
        expect(alignmentStatement(by(758.2437, 1.3011594, { matched: 462, residual: mm(1.538), scaleError: 1.3011594 * 3.1e-5 })))
            .toBe('shift 758.24 mm, scale 1.301159, on 462 notes 1.54 mm apart, scale to 31 ppm')
    })

    it('gives the numbers alone for an alignment recorded without them', () => {
        expect(alignmentStatement(by(-92.5065, 0.9978034872721986))).toBe('shift -92.51 mm, scale 0.997803')
    })

    it('reads a share in parts per million', () => {
        expect(inPpm(1.69e-5)).toBe('17 ppm')
    })
})

describe('how far aligning again moves a copy', () => {
    it('is nothing where the alignment is the same', () => {
        expect(movesBy(copyAlignedBy(by(10, 1.3)), by(10, 1.3))).toBeCloseTo(0, 9)
    })

    it('is the most the two lines part over the copy\'s own paper', () => {
        // Scaled by a thousandth more, the far end of 1005 mm plus the shift moves by 1.015 mm.
        expect(movesBy(copyAlignedBy(by(10, 1)), by(10, 1.001))).toBeCloseTo(1.015, 9)
    })

    it('is nothing to say for a copy without features', () => {
        expect(movesBy({ ...copyAlignedBy(by(0, 1)), production: {} }, by(0, 1))).toBeUndefined()
    })
})

describe('a problem of the alignments put into words', () => {
    it('says by how much the stated speed misses the paper', () => {
        expect(problemStatement({ copy: 'Ch1', problem: 'speed-disagrees-with-paper', by: Math.log(1.0975) }))
            .toBe('The paper speed stated for the copy gives a ratio of the papers 9.75 % above what the alignments give.')
    })

    it('puts every kind into different words', () => {
        const kinds = ['not-aligned', 'aligned-against-another-copy', 'speed-disagrees-with-paper', 'paper-beyond-its-spread'] as const
        expect(new Set(kinds.map(problem => problemStatement({ copy: 'c', problem }))).size).toBe(kinds.length)
    })
})
