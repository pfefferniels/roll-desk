import { describe, expect, it } from 'vitest'
import { blendAt, transcriptionTakesPointer, workingPosition } from './facsimileBlend'

const sweep = Array.from({ length: 101 }, (_, i) => i / 100).map(blendAt)

describe('blending the scan into its transcription', () => {
    it('shows the scan whole and alone at the left end', () => {
        expect(blendAt(0)).toEqual({ facsimile: 1, transcription: 0, layout: 0 })
    })

    it('drops the scan at the right end, so that no tile is asked for', () => {
        expect(blendAt(1)).toEqual({ facsimile: 0, transcription: 1, layout: 1 })
    })

    it('lays the working view out in the middle', () => {
        expect(blendAt(workingPosition)).toEqual({ facsimile: 1, transcription: 1, layout: 1 })
    })

    it('cuts the scan up before it fades it away', () => {
        expect(blendAt(0.25)).toEqual({ facsimile: 1, transcription: 0.5, layout: 0.5 })
        expect(blendAt(0.75)).toEqual({ facsimile: 0.5, transcription: 1, layout: 1 })
    })

    it('holds every reading between nothing and full', () => {
        const readings = sweep.flatMap(
            ({ facsimile, transcription, layout }) => [facsimile, transcription, layout]
        )
        expect(readings.filter(value => value < 0 || value > 1)).toEqual([])
    })

    it('moves each reading one way only', () => {
        const rises = (readings: number[]) =>
            readings.every((value, i) => i === 0 || value >= (readings[i - 1] ?? value))

        expect(rises(sweep.map(blend => blend.transcription))).toBe(true)
        expect(rises(sweep.map(blend => blend.layout))).toBe(true)
        expect(rises(sweep.map(blend => -blend.facsimile))).toBe(true)
    })

    it('holds at the ends beyond them', () => {
        expect(blendAt(-1)).toEqual(blendAt(0))
        expect(blendAt(2)).toEqual(blendAt(1))
    })
})

describe('pointing at the transcription', () => {
    it('gives it up where it has faded out', () => {
        expect(transcriptionTakesPointer(blendAt(0))).toBe(false)
    })

    it('keeps it wherever the transcription shows at all, however faintly', () => {
        expect(sweep.slice(1).filter(blend => !transcriptionTakesPointer(blend))).toEqual([])
    })
})
