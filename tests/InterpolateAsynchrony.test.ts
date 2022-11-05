import { Asynchrony, MPM } from "../src/lib/mpm"
import { prepareMSM } from "../src/lib/msm"
import { readFileSync } from "fs"
import { InterpolateAsynchrony } from "../src/lib/transformers"
import { jest } from '@jest/globals'

describe('InterpolateAsynchrony', () => {
    jest.setTimeout(60000)

    it(`Interpolates asynchrony in a real-world test case (WM 879)`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/asynchrony/score.mei', 'utf-8'),
            readFileSync('tests/files/asynchrony/performance.mid'),
            readFileSync('tests/files/asynchrony/alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolateAsynchrony({
            part: 0,
            tolerance: 10,
            precision: 0
        })
        transformer.transform(msm, mpm)

        // Assert
        // The asynchronies calculated in Sonic Visualiser are:
        // 297 ms - 223 ms - 150 ms - 214 ms - 217 ms
        // Since the last asynchrony (217) is in range of the preceding one (213),
        // it should not be present in the interpolation
        const asynchronyInstructions = mpm.getInstructions<Asynchrony>('asynchrony', 0)
        expect(asynchronyInstructions.map(i => i["milliseconds.offset"])).toEqual([297, 223, 150, 214])
    })
})
