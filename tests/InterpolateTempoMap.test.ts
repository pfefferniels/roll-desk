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
    return new MSM(alignedPerformance)
}

describe('InterpolateTempoMap', () => {
    it(`Generates a tempo map with exactly one tempo tempo
        instruction given a MIDI file with a constant tempo`, async () => {
        const msm = await generateMSM('tests/files/test010.mei', 'tests/files/test010.mid')
        const mpm = new MPM()

        const transformer = new InterpolateTempoMap()
        transformer.transform(msm, mpm)

        // expect a static tempo
        const tempoInstructions = mpm.getInstructions<Tempo>('tempo', 'global')

        expect(tempoInstructions.length).toEqual(1)
        expect(tempoInstructions[0]).toEqual({
            type: 'tempo',
            date: 0,
            beatLength: 0.25,
            bpm: 100
        })
    })

    it(`Generates a tempo map with exactly one tempo tempo
        instruction given a beat length of whole bars and a MIDI file with a constant tempo`, async () => {
        const msm = await generateMSM('tests/files/test010.mei', 'tests/files/test010.mid')
        const mpm = new MPM()

        const transformer = new InterpolateTempoMap()
        transformer.setOptions({
            beatLength: 'bar',
            epsilon: 4
        })
        transformer.transform(msm, mpm)

        // expect a static tempo
        const tempoInstructions = mpm.getInstructions<Tempo>('tempo', 'global')

        expect(tempoInstructions.length).toEqual(1)
        expect(tempoInstructions[0]).toEqual({
            type: 'tempo',
            date: 0,
            beatLength: 1,
            bpm: 25
        })
    })
})
