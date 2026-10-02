import { describe, expect, it } from 'vitest'
import { track, welteT100 } from 'linked-rolls'
import type { Expression, Note } from 'linked-rolls'
import { lanesOf, rollGeometry } from '../canvas/rollGeometry'
import { svg } from '../canvas/units'
import { dynamicsRoom, feetIn, heightOf } from './Dynamics'
import { halfOf, whiskerReach } from './whisker'

const geometry = rollGeometry(lanesOf(svg(1), svg(10)), svg(16), welteT100)
const room = { above: dynamicsRoom, below: dynamicsRoom }
const drawing = { height: geometry.height, room }
const velocity = { piano: 35, mezzoforte: 60, forte: 90 }
const feet = feetIn(geometry)

const note = { type: 'note', pitch: 60 } as Note
const bassExpression = { type: 'expression', expressionType: 'MezzoforteOn', scope: 'bass' } as Expression
const trebleExpression = { ...bassExpression, scope: 'treble' } as Expression

/** The lane a track is drawn in on the desk's version layout. */
const laneOf = (position: number) => ({ y: geometry.trackToY(track(position)), height: geometry.laneHeight(track(position)) })

describe('the half of the keyboard a command answers to', () => {
    it('is the scope of an expression, whatever the division', () => {
        expect(halfOf(bassExpression, track(5), track(54))).toBe('bass')
        expect(halfOf(trebleExpression, track(95), undefined)).toBe('treble')
    })

    it('is the treble for a note from the division upwards and the bass below it', () => {
        expect(halfOf(note, track(54), track(54))).toBe('treble')
        expect(halfOf(note, track(53), track(54))).toBe('bass')
    })

    it('is unknown for a note where nothing divides the keyboard', () => {
        expect(halfOf(note, track(53), undefined)).toBeUndefined()
    })
})

describe('how far a whisker reaches', () => {
    it('runs up through the treble expression to the head of the treble dynamics', () => {
        const lane = laneOf(60)
        const [top, bottom] = whiskerReach(lane, 'treble', drawing)

        expect(top).toBe(heightOf(velocity.forte, feet.treble, velocity))
        expect(bottom).toBe(lane.y + 2 * lane.height)
    })

    it('runs down through the bass expression to the foot of the bass dynamics', () => {
        const lane = laneOf(40)
        const [top, bottom] = whiskerReach(lane, 'bass', drawing)

        expect(top).toBe(lane.y - lane.height)
        expect(bottom).toBe(feet.bass)
    })

    it('spans the bar where the half is not known', () => {
        expect(whiskerReach(laneOf(40), undefined, drawing)).toEqual([0, geometry.height])
    })
})
