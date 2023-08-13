import { MPM, Tempo } from "../src/lib/mpm"
import { InterpolateTempoMap } from "../src/lib/transformers"
import { prepareMSM } from "../src/lib/msm"
import { readFileSync } from "fs"
import { jest } from '@jest/globals'

jest.useFakeTimers()

describe('InterpolateTempoMap', () => {
    // jest.setTimeout(60000)

    it(`Generates a tempo map with exactly one tempo tempo
        instruction given a MIDI file with a constant tempo`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/tempo/neutral.mei', 'utf16le'),
            readFileSync('tests/files/tempo/neutral.mid'))
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

    it(`Correctly interpolates tempo transitions`, async () => {
        // Arrange
        const msm = await prepareMSM(
            readFileSync('tests/files/tempo/neutral.mei', 'utf16le'),
            readFileSync('tests/files/tempo/transition.mid'),
            readFileSync('tests/files/tempo/transition-alignment.jsonld', 'utf-8'))
        const mpm = new MPM()

        // Act
        const transformer = new InterpolateTempoMap()
        transformer.transform(msm, mpm)

        // Assert
        // This MIDI file was generated with a linear tempo transition from 
        // quarters = 30 to quarters = 60
        const tempoInstructions = mpm.getInstructions<Tempo>('tempo', 'global')
        expect(tempoInstructions).toEqual([{
            'xml:id': expect.any(String),
            type: 'tempo',
            date: 0,
            beatLength: 0.25,
            bpm: 30,
            'transition.to': 60,
            meanTempoAt: 0.5
        },
        {
            'xml:id': expect.any(String),
            type: 'tempo',
            date: 1440,
            beatLength: 0.25,
            bpm: 60
        }])
    })
})
