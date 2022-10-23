import { MPM, Tempo } from "../src/lib/mpm"
import { InterpolateTempoMap } from "../src/lib/transformers"
import { prepareMSM } from "../src/lib/msm"
import { readFileSync } from "fs"

describe('InterpolateTempoMap', () => {
    it(`Generates a tempo map with exactly one tempo tempo
        instruction given a MIDI file with a constant tempo`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/neutral-tempo/score.mei', 'utf16le'),
            readFileSync('tests/files/neutral-tempo/neutral.mid'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolateTempoMap()
        transformer.transform(msm, mpm)

        // Assert
        const tempoInstructions = mpm.getInstructions<Tempo>('tempo', 'global')
        expect(tempoInstructions).toEqual([{
            'xml:id': expect.any(String),
            type: 'tempo',
            date: 0,
            beatLength: 0.25,
            bpm: 32
        }])
    })
})
