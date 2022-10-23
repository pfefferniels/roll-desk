import { MPM, Ornament } from "../src/lib/mpm"
import { InterpolatePhysicalOrnamentation } from "../src/lib/transformers"
import { prepareMSM } from "../src/lib/msm"
import { readFileSync } from "fs"

describe('InterpolatePhysicalOrnamentation', () => {
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

    it(`correctly interpolates complex arpeggiations (WM 79)`, async () => {
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
        const ornamentInstructions = mpm.getInstructions<Ornament>('ornament', 'global')
        expect(ornamentInstructions.length).toEqual(7)
        ornamentInstructions.forEach(ornament => {
            expect(ornament).toMatchSnapshot({
                'xml:id': expect.any(String)
            })
        })
    })
})
