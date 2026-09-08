import { describe, expect, it } from 'vitest'
import { seconds } from 'linked-rolls'
import { isRollFile, placeOnPaper } from './RollCopyDialog'

const named = (name: string) => new File([], name)

describe('the files the dialog reads a roll from', () => {
    it('takes an analysis, a Spencer e-roll and a Phillips e-roll', () => {
        expect(isRollFile(named('mf320jq4997_analysis.txt'))).toBe(true)
        expect(isRollFile(named('W225E.bar'))).toBe(true)
        expect(isRollFile(named('Traumerei (Schumann) Grunfeld LW e.mid'))).toBe(true)
    })

    it('leaves the settings file beside a Spencer e-roll to the speed it suggests', () => {
        expect(isRollFile(named('W225E.ann'))).toBe(false)
    })
})

describe('putting the time of a roll reader back onto the paper', () => {
    it('runs the paper Gottschewski’s 1.45 m in his half minute', () => {
        expect(placeOnPaper(seconds(30))).toBeCloseTo(1450, -1)
    })

    it('starts at the beginning of the roll', () => {
        expect(placeOnPaper(seconds(0))).toBe(0)
    })

    it('accelerates, the take-up spool filling as the roll runs', () => {
        const first = placeOnPaper(seconds(60))
        const second = placeOnPaper(seconds(120)) - first
        expect(second).toBeGreaterThan(first)
    })
})
