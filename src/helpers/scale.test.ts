import { describe, expect, it } from 'vitest'
import { ruler, ScaleUnit } from './scale'
import { zoomMarks, zoomRange } from './zoom'

const spacing = 60
const length = 5000

describe('the scale along the roll', () => {
    it('takes the step the zoom asks for', () => {
        const expected: { zoom: number, step: number, unit: ScaleUnit }[] = [
            { zoom: 0.1, step: 1000, unit: 'cm' },
            { zoom: 0.25, step: 500, unit: 'cm' },
            { zoom: 0.5, step: 200, unit: 'cm' },
            { zoom: 1, step: 100, unit: 'cm' },
            { zoom: 2, step: 50, unit: 'cm' },
            { zoom: 4, step: 20, unit: 'cm' },
            { zoom: 12, step: 5, unit: 'mm' }
        ]

        expected.forEach(({ zoom, step, unit }) => {
            expect(ruler({ length, zoom, spacing })).toMatchObject({ step, unit })
        })
    })

    it('keeps two readings a label apart', () => {
        zoomMarks.forEach(zoom => {
            expect(ruler({ length, zoom, spacing }).step * zoom).toBeGreaterThanOrEqual(spacing)
        })
    })

    it('takes the smallest step in ones, twos and fives that does', () => {
        const ladder = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

        zoomMarks.forEach(zoom => {
            const wide = ladder.filter(size => size * zoom >= spacing)

            expect(ruler({ length, zoom, spacing }).step).toEqual(Math.min(...wide))
        })
    })

    it('reads in centimetres', () => {
        expect(ruler({ length, zoom: 1, spacing }).labelled.slice(0, 3)).toEqual([
            { at: 0, label: '0 cm' },
            { at: 100, label: '10 cm' },
            { at: 200, label: '20 cm' }
        ])
    })

    it('turns to millimetres once a step falls short of a centimetre', () => {
        const { unit, step, labelled } = ruler({ length: 20, zoom: 30, spacing })

        expect({ unit, step }).toEqual({ unit: 'mm', step: 2 })
        expect(labelled[3]).toEqual({ at: 6, label: '6 mm' })
    })

    it('reaches millimetres at the far end of the desk, and no sooner', () => {
        expect(ruler({ length, zoom: zoomRange.max, spacing }).unit).toEqual('mm')
        expect(ruler({ length, zoom: zoomRange.max * 0.99, spacing }).unit).toEqual('cm')
    })

    it('goes no finer than the millimetre the roll is measured to', () => {
        expect(ruler({ length, zoom: 1000, spacing }).step).toEqual(1)
    })

    it('divides every step evenly and leaves the readings to the labelled ticks', () => {
        const { step, labelled, plain } = ruler({ length, zoom: 1, spacing })
        const parts = plain.filter(at => at > 0 && at < step)

        expect(parts).toEqual([20, 40, 60, 80])
        expect(plain).not.toContain(labelled[1].at)
    })

    it('stays inside the roll', () => {
        zoomMarks.forEach(zoom => {
            const { labelled, plain } = ruler({ length, zoom, spacing })
            const ticks = [...labelled.map(({ at }) => at), ...plain]

            expect(Math.min(...ticks)).toEqual(0)
            expect(Math.max(...ticks)).toBeLessThan(length)
        })
    })
})

describe('the stretch a scale is laid over', () => {
    const over = (from: number, to: number) =>
        ruler({ length, zoom: 1, spacing, over: { from, to } })

    it('takes its first reading inside the stretch', () => {
        expect(over(250, 460).labelled).toEqual([
            { at: 300, label: '30 cm' },
            { at: 400, label: '40 cm' }
        ])
    })

    it('keeps the plain ticks of a step the stretch begins in the middle of', () => {
        expect(over(250, 460).plain).toEqual([260, 280, 320, 340, 360, 380, 420, 440])
    })

    it('lays the ticks the whole roll would have there', () => {
        const zoom = 4
        const [from, to] = [250, 1300]
        const inside = (at: number) => at >= from && at < to

        const whole = ruler({ length, zoom, spacing })
        const part = ruler({ length, zoom, spacing, over: { from, to } })

        expect(part.labelled).toEqual(whole.labelled.filter(({ at }) => inside(at)))
        expect(part.plain).toEqual(whole.plain.filter(inside))
    })

    it('draws nothing where the stretch is empty', () => {
        expect(over(300, 300)).toMatchObject({ labelled: [], plain: [] })
    })

    it('draws nothing where the stretch lies past the end of the roll', () => {
        expect(over(length + 1000, length + 2000)).toMatchObject({ labelled: [], plain: [] })
    })

    it('stops at the end of the roll where the stretch runs over it', () => {
        const { labelled, plain } = over(length - 100, length + 1000)

        expect(labelled).toEqual([{ at: 4900, label: '490 cm' }])
        expect(plain).toEqual([4920, 4940, 4960, 4980])
    })

    it('starts at the roll where the stretch begins before it', () => {
        const { labelled, plain } = over(-400, 200)

        expect(labelled.map(({ at }) => at)).toEqual([0, 100])
        expect(plain).toEqual([20, 40, 60, 80, 120, 140, 160, 180])
    })

    it('steps as the zoom asks whatever stretch it is given', () => {
        zoomMarks.forEach(zoom => {
            const part = ruler({ length, zoom, spacing, over: { from: 1000, to: 1200 } })

            expect(part.step).toEqual(ruler({ length, zoom, spacing }).step)
        })
    })
})
