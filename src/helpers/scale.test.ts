import { describe, expect, it } from 'vitest'
import { ruler, ScaleUnit } from './scale'

const spacing = 60
const length = 5000

/** The zooms the desk offers, from the slider's ends and its marks. */
const zooms = [0.1, 0.25, 0.5, 1, 1.5, 2, 2.5]

describe('the scale along the roll', () => {
    it('takes the step the zoom asks for', () => {
        const expected: { zoom: number, step: number, unit: ScaleUnit }[] = [
            { zoom: 0.1, step: 1000, unit: 'cm' },
            { zoom: 0.25, step: 500, unit: 'cm' },
            { zoom: 0.5, step: 200, unit: 'cm' },
            { zoom: 1, step: 100, unit: 'cm' },
            { zoom: 2.5, step: 50, unit: 'cm' }
        ]

        expected.forEach(({ zoom, step, unit }) => {
            expect(ruler(length, zoom, spacing)).toMatchObject({ step, unit })
        })
    })

    it('keeps two readings a label apart', () => {
        zooms.forEach(zoom => {
            expect(ruler(length, zoom, spacing).step * zoom).toBeGreaterThanOrEqual(spacing)
        })
    })

    it('takes the smallest step in ones, twos and fives that does', () => {
        const ladder = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

        zooms.forEach(zoom => {
            const wide = ladder.filter(size => size * zoom >= spacing)

            expect(ruler(length, zoom, spacing).step).toEqual(Math.min(...wide))
        })
    })

    it('reads in centimetres', () => {
        expect(ruler(length, 1, spacing).labelled.slice(0, 3)).toEqual([
            { at: 0, label: '0 cm' },
            { at: 100, label: '10 cm' },
            { at: 200, label: '20 cm' }
        ])
    })

    it('turns to millimetres once a step falls short of a centimetre', () => {
        const { unit, step, labelled } = ruler(20, 30, spacing)

        expect({ unit, step }).toEqual({ unit: 'mm', step: 2 })
        expect(labelled[3]).toEqual({ at: 6, label: '6 mm' })
    })

    it('goes no finer than the millimetre the roll is measured to', () => {
        expect(ruler(length, 1000, spacing).step).toEqual(1)
    })

    it('divides every step evenly and leaves the readings to the labelled ticks', () => {
        const { step, labelled, plain } = ruler(length, 1, spacing)
        const parts = plain.filter(at => at > 0 && at < step)

        expect(parts).toEqual([20, 40, 60, 80])
        expect(plain).not.toContain(labelled[1].at)
    })

    it('stays inside the roll', () => {
        zooms.forEach(zoom => {
            const { labelled, plain } = ruler(length, zoom, spacing)
            const ticks = [...labelled.map(({ at }) => at), ...plain]

            expect(Math.min(...ticks)).toEqual(0)
            expect(Math.max(...ticks)).toBeLessThan(length)
        })
    })
})
