import { Dynamics, MPM } from "../src/lib/mpm"
import { prepareMSM } from "../src/lib/msm"
import { readFileSync } from "fs"
import { InterpolateDynamicsMap } from "../src/lib/transformers"

describe('InterpolateDynamics', () => {
    it(`Interpolates dynamics in a real-world test case (WM 198)`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/dynamics/crescendo.mei', 'utf16le'),
            readFileSync('tests/files/dynamics/crescendo.mid'),
            readFileSync('tests/files/dynamics/alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolateDynamicsMap()
        transformer.transform(msm, mpm)

        // Assert
        // The crescendo goes from 33 to 79
        const dynamics = mpm.getInstructions<Dynamics>('dynamics', 'global')
        expect(dynamics).toContainEqual({
            type: 'dynamics',
            'xml:id': expect.any(String),
            date: 360,
            volume: 33,
            'transition.to': 79,
            protraction: expect.any(Number)
        })
    })
})
