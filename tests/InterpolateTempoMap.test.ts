import { MPM, Tempo } from "../src/lib/Mpm"
import { MSM } from "../src/lib/Msm"
import { AlignedPerformance } from "../src/lib/AlignedPerformance"
import { Mei } from "../src/lib/Score"
import { RawPerformance } from "../src/lib/Performance"
import { InterpolateTempoMap } from "../src/lib/transformers/InterpolateTempoMap"
import * as fs from 'fs';
import { loadVerovio, loadDomParser } from '../src/lib/globals'

const generateMSM = async (meiFile: string, midiFile: string): Promise<MSM> => {
    let { read } = await import("midifile-ts");

    const mei = fs.readFileSync(meiFile, 'utf16le')
    const midi = fs.readFileSync(midiFile)
    const arr = Uint8Array.from(midi)

    const score = new Mei(mei, await loadVerovio(), await loadDomParser())
    const performance = new RawPerformance(read(arr))
    const alignedPerformance = new AlignedPerformance(score, performance)
    alignedPerformance.performAlignment()
    return new MSM(alignedPerformance)
}

describe('InterpolateTempoMap', () => {
    it(`Generates a tempo map with exactly one tempo tempo
        instruction given a MIDI file with a constant tempo`, async () => {
        // Arrange
        const msm = await generateMSM('tests/files/neutral-tempo/score.mei', 'tests/files/neutral-tempo/neutral.mid')
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
