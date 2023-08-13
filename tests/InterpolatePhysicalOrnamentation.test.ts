import { MPM, Ornament } from "../src/lib/mpm"
import { InterpolatePhysicalOrnamentation } from "../src/lib/transformers"
import { prepareMSM } from "../src/lib/msm"
import { readFileSync } from "fs"
import { jest } from '@jest/globals'

jest.useFakeTimers()

describe('InterpolatePhysicalOrnamentation', () => {
    // jest.setTimeout(60000)

    it(`does not interpolate anything when no arpeggiation is given`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/arpeggiation/score.mei', 'utf16le'),
            readFileSync('tests/files/arpeggiation/neutral.mid'),
            readFileSync('tests/files/arpeggiation/neutral-alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolatePhysicalOrnamentation()
        transformer.transform(msm, mpm)

        // Assert
        const ornamentInstruction = mpm.getInstructions<Ornament>('ornament', 'global')
        expect(ornamentInstruction.length).toEqual(0)
    })

    it(`calculates the noteoff.shift attribute`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/arpeggiation/noteoff.shift.mei', 'utf-8'),
            readFileSync('tests/files/arpeggiation/noteoff.shift.mid'),
            readFileSync('tests/files/arpeggiation/noteoff.shift-alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolatePhysicalOrnamentation()
        transformer.transform(msm, mpm)

        // Assert
        const ornamentInstructions = mpm.getInstructions<Ornament>('ornament', 'global')
        expect(ornamentInstructions.map(o => o["noteoff.shift"])).toEqual(['true', 'false', 'monophonic'])
    })

    it(`correctly interpolates real-word arpeggiations (WM 79)`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/arpeggiation/score.mei', 'utf16le'),
            readFileSync('tests/files/arpeggiation/arpeggiated.mid'),
            readFileSync('tests/files/arpeggiation/arpeggiated-alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolatePhysicalOrnamentation()
        transformer.transform(msm, mpm)

        // Assert
        // In all the three bars, every chord is arpeggiated, which should result
        // in 9 arpeggio instructions. Their lengthes are measured in Sonic Visualiser.
        // The last two, however, are being played so quickly, that they fall
        // under the default threshold.
        const arpeggios = mpm.getInstructions<Ornament>('ornament', 'global')
        expect(arpeggios).toHaveLength(7)
        expect(arpeggios.map(a => a.frameLength)).toEqual([130, 35, 99, 310, 136, 188, 172 /* 12, 3 */])
    })
})
