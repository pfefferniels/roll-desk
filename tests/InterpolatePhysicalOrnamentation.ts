import { MPM, Ornament, Tempo } from "../src/lib/Mpm"
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

describe('InterpolatePhysicalOrnamentation', () => {
    it(`does not interpolate anything when no ornamentation is given`, async () => {
        const msm = await generateMSM('tests/files/test010.mei', 'tests/files/test010.mid')
        const mpm = new MPM()

        const transformer = new InterpolateTempoMap()
        transformer.transform(msm, mpm)

        // expect no ornamentation at all
        const ornamentInstruction = mpm.getInstructions<Ornament>('ornament', 'global')

        expect(ornamentInstruction.length).toEqual(0)
    })
})
