// @vitest-environment jsdom

import { expect, test } from "vitest"
import { parseMSM } from "../msm"
import { readFileSync } from "fs"
import { MPM, Rubato } from "../mpm"
import { InterpolateRubato } from "./InterpolateRubato"
import { InterpolateTempoMap } from "./InterpolateTempoMap"

test('it correctly interpolates swing time/inegalité', () => {
    const msm = parseMSM(
        readFileSync('tests/files/rubato/swing.msm', 'utf-8'))
    const mpm = new MPM()

    // Act
    const tempo = new InterpolateTempoMap({ beatLength: 'halfbar', epsilon: 0, precision: 2 })
    const rubato = new InterpolateRubato({ part: 0, tolerance: 0 })
    tempo.setNext(rubato)
    tempo.transform(msm, mpm)

    // Assert
    const rubatos = mpm.getInstructions<Rubato>('rubato', 0)

    expect(rubatos).toHaveLength(1)
    expect(rubatos.at(0)?.frameLength).toEqual(1440)
    expect(rubatos.at(0)?.intensity).toEqual(0.5)
    expect(rubatos.at(0)?.loop).toBeTruthy()
})

