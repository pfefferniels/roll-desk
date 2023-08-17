// @vitest-environment jsdom

import { expect, test } from "vitest"
import { parseMSM } from "../msm"
import { readFileSync } from "fs"
import { Articulation, MPM } from "../mpm"
import { InterpolateTempoMap } from "./InterpolateTempoMap"
import { InterpolateRubato } from "./InterpolateRubato"
import { InterpolateArticulation } from "./InterpolateArticulation"

test('correctly interpolates articulation with a rubato map present', () => {
    // Arrange
    const msm = parseMSM(readFileSync('tests/files/articulation/with-rubato.msm', 'utf-8'))
    const mpm = new MPM()

    const tempo = new InterpolateTempoMap({ beatLength: 'halfbar', epsilon: 0, precision: 2 })
    const rubato = new InterpolateRubato({ part: 0, tolerance: 0 })
    const articulation = new InterpolateArticulation({ part: 0, relativeDurationPrecision: 2, relativeDurationTolerance: 0 })
    tempo.setNext(rubato)
    rubato.setNext(articulation)

    // Act
    tempo.transform(msm, mpm)

    // Assert
    const articulations = mpm.getInstructions<Articulation>('articulation', 0)

    expect(articulations.map(articulation => articulation.relativeDuration)).toEqual([1.5, 0.5, 1.5])
})
