import { describe, expect, it } from 'vitest'
import { mm } from 'linked-rolls'
import { samplesOnRoll } from './samplesOnRoll'

/** A curve sampled every tenth of a millimetre from the beginning of the roll. */
const places = (length: number) => Float64Array.from({ length }, (_, sample) => sample / 10)

describe('the samples of a curve that fall on the drawn roll', () => {
    it('takes every stride-th one, beginning at the first', () => {
        expect(samplesOnRoll(places(100), mm(10), 25)).toEqual([0, 25, 50, 75])
    })

    it('leaves out the run-out the grid adds past the end of the roll', () => {
        expect(samplesOnRoll(places(100), mm(5), 25)).toEqual([0, 25, 50])
    })

    it('keeps them all where the curve ends before the roll does', () => {
        expect(samplesOnRoll(places(60), mm(100), 25)).toEqual([0, 25, 50])
    })

    it('keeps nothing of a curve that lies past the roll altogether', () => {
        expect(samplesOnRoll(places(100), mm(-1), 25)).toEqual([])
    })
})
