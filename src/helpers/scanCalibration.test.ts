import { describe, expect, it } from 'vitest'
import { columnsOf, px, RollCopy, track, TrackCalibration } from 'linked-rolls'
import { drawableCalibrationOf, refusalToDrawScans } from './scanCalibration'

const calibrationOfSeparation = (separation: number): TrackCalibration => ({
    unit: 'px',
    offset: px(2000),
    separation: px(separation),
    shift: track(0)
})

const copyWith = (separation: number, keeper = 'Museum'): RollCopy => ({
    type: 'RollCopy',
    id: `copy-${separation}`,
    ops: [],
    conditions: [],
    modifications: [],
    keeper: { name: keeper, sameAs: [] },
    features: [],
    scan: 'https://example.org/iiif/roll',
    measurements: { trackCalibration: calibrationOfSeparation(separation) }
})

describe('the column run a calibration gives', () => {
    it('ascends while the columns rise with the tracks', () => {
        const columns = columnsOf(track(10), track(20), calibrationOfSeparation(25))

        expect(columns.to).toBeGreaterThan(columns.from)
        expect(columns.width).toBeGreaterThan(0)
    })

    it('descends once they do not, which is what the strips cannot draw', () => {
        const columns = columnsOf(track(10), track(20), calibrationOfSeparation(-25))

        expect(columns.to).toBeLessThan(columns.from)
        expect(columns.width).toBeLessThan(0)
    })
})

describe('the calibration a scan is drawn by', () => {
    it('takes one whose columns rise with the tracks', () => {
        expect(drawableCalibrationOf(copyWith(25))).toEqual(calibrationOfSeparation(25))
    })

    it('leaves out one whose columns fall as the tracks rise', () => {
        expect(drawableCalibrationOf(copyWith(-25))).toBeUndefined()
    })

    it('leaves out one that puts every track on the same column', () => {
        expect(drawableCalibrationOf(copyWith(0))).toBeUndefined()
    })

    it('has nothing to give for a copy that carries no calibration', () => {
        expect(drawableCalibrationOf({ ...copyWith(25), measurements: {} })).toBeUndefined()
    })
})

describe('what an imported document is told about its scans', () => {
    it('says nothing while every scan can be drawn', () => {
        expect(refusalToDrawScans([copyWith(25)])).toBeUndefined()
    })

    it('names the keeper of a scan that is left out', () => {
        const refusal = refusalToDrawScans([copyWith(25), copyWith(-25, 'Stanford')])

        expect(refusal).toContain('Stanford')
        expect(refusal).not.toContain('Museum')
    })

    it('names them all when several are left out', () => {
        const refusal = refusalToDrawScans([copyWith(-25, 'Stanford'), copyWith(-30, 'Freiburg')])

        expect(refusal).toContain('Stanford, Freiburg')
    })

    it('passes over a copy that states no scan', () => {
        expect(refusalToDrawScans([{ ...copyWith(-25), scan: undefined }])).toBeUndefined()
    })
})
