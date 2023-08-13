import { Articulation, Asynchrony, MPM } from "../src/lib/mpm"
import { prepareMSM } from "../src/lib/msm"
import { readFileSync } from "fs"
import { InterpolateArticulation, InterpolateTempoMap } from "../src/lib/transformers"
import { jest } from '@jest/globals'

jest.useFakeTimers()

describe('Interpolate articulation', () => {
    // jest.setTimeout(60000)

    it(`Interpolates articulation in a real-world test case (WM 767)`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/articulation/score.mei', 'utf-8'),
            readFileSync('tests/files/articulation/performance.mid'),
            readFileSync('tests/files/articulation/alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolateTempoMap().setNext(new InterpolateArticulation())
        transformer.transform(msm, mpm)

        // Assert
        // Up to bar 3 (date 8640), everything is being played more or less staccato
        const articulations = mpm.getInstructions<Articulation>('articulation', 0)
        expect(articulations
            .filter(a => a.date <= 8640)
            .every(a => a.relativeDuration <= 0.2)).toBe(true)
    })
})
