import { describe, expect, it } from 'vitest'
import { welteT100 } from 'linked-rolls'
import { rollGeometry } from '../canvas/rollGeometry'
import { svg } from '../canvas/units'
import { dynamicsRoom, feetIn, heightOf } from './Dynamics'

const geometry = rollGeometry({ note: svg(1), expression: svg(10) }, svg(16), welteT100)
const feet = feetIn(geometry)
const velocity = { piano: 35, mezzoforte: 60, forte: 90 }

describe('the bands the dynamics are drawn in', () => {
    it('stand beyond the bar, the treble above it and the bass below it', () => {
        expect(heightOf(velocity.forte, feet.treble, velocity)).toBe(0 - dynamicsRoom)
        expect(feet.treble).toBeLessThan(0)
        expect(heightOf(velocity.forte, feet.bass, velocity)).toBeGreaterThan(geometry.height)
        expect(feet.bass).toBe(geometry.height + dynamicsRoom)
    })

    it('carry piano on their foot and a louder velocity higher up', () => {
        expect(heightOf(velocity.piano, feet.bass, velocity)).toBe(feet.bass)
        expect(heightOf(velocity.mezzoforte, feet.bass, velocity)).toBeLessThan(feet.bass)
    })
})
