// @vitest-environment jsdom

import { expect, test } from 'vitest'
import { readFileSync } from "fs"
import { parseMSM } from '../msm'
import { MPM, Ornament } from '../mpm'
import { InterpolatePhysicalOrnamentation } from './InterpolatePhysicalOrnamentation'

test('does not interpolate anything when no arpeggiation is given', () => {
    // Arrange
    const msm = parseMSM(
        readFileSync('tests/files/arpeggiation/neutral.msm', 'utf-8'))
    const mpm = new MPM()

    // Act
    const transformer = new InterpolatePhysicalOrnamentation()
    transformer.transform(msm, mpm)

    // Assert
    const ornamentInstruction = mpm.getInstructions<Ornament>('ornament', 'global')
    expect(ornamentInstruction.length).toEqual(0)
})

