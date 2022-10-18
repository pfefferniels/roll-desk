import { MPM, Ornament } from "../src/lib/Mpm"
import { InterpolatePhysicalOrnamentation } from "../src/lib/transformers/InterpolatePhysicalOrnamentation"
import { prepareMSM } from "../src/lib/prepareMSM"
import { readFileSync } from "fs"

describe('InterpolatePhysicalOrnamentation', () => {
    it(`does not interpolate anything when no arpeggiation is given`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/arpeggiation/score.mei', 'utf16le'),
            readFileSync('tests/files/arpeggiation/neutral.mid'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolatePhysicalOrnamentation()
        transformer.transform(msm, mpm)

        // Assert
        const ornamentInstruction = mpm.getInstructions<Ornament>('ornament', 'global')
        expect(ornamentInstruction.length).toEqual(2)
    })

    it(`correctly interpolates complex arpeggiations (WM 79)`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/arpeggiation/score.mei', 'utf16le'),
            readFileSync('tests/files/arpeggiation/arpeggiated.mid'),
            readFileSync('tests/files/arpeggiation/alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolatePhysicalOrnamentation()
        transformer.transform(msm, mpm)

        // Assert
        const ornamentInstruction = mpm.getInstructions<Ornament>('ornament', 'global')
        expect(ornamentInstruction.length).toEqual(7)
    })
})
