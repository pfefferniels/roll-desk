import { describe, expect, it } from 'vitest'
import { mm, track, welteT100, welteT98 } from 'linked-rolls'
import type { NegotiatedEvent } from 'linked-rolls'
import { latchedAt, latchesOf } from './latches'

/** A command where it lies on the roll; where on the bar plays no part here. */
const placed = (command: object, at: number, length: number) => ({
    ...command,
    horizontal: { from: mm(at), to: mm(at + length), unit: 'mm' as const },
    vertical: { from: track(1), to: track(1), unit: 'track' as const }
}) as NegotiatedEvent

const expression = (id: string, expressionType: string, scope: 'bass' | 'treble', at: number) =>
    placed({ id, type: 'expression', expressionType, scope }, at, 2)

const note = (id: string, at: number) => placed({ id, type: 'note', pitch: 60 }, at, 20)

const standingAt = (events: NegotiatedEvent[], at: number, bar = welteT100) =>
    latchedAt(latchesOf(events, bar), mm(at)).map(on => on.id)

describe('which functions stand where playback has reached', () => {
    const roll = [
        expression('mf on', 'MezzoforteOn', 'bass', 100),
        note('a', 120),
        expression('mf off', 'MezzoforteOff', 'bass', 200),
        note('b', 250)
    ]

    it('keeps a function on from the command that latches it to the one that cancels it', () => {
        expect(standingAt(roll, 50)).toEqual([])
        expect(standingAt(roll, 100)).toEqual(['mf on'])
        expect(standingAt(roll, 150)).toEqual(['mf on'])
        expect(standingAt(roll, 200)).toEqual([])
        expect(standingAt(roll, 250)).toEqual([])
    })

    it('holds the two halves apart where the side counts', () => {
        const halves = [
            expression('bass on', 'MezzoforteOn', 'bass', 100),
            expression('treble on', 'MezzoforteOn', 'treble', 110),
            expression('bass off', 'MezzoforteOff', 'bass', 200)
        ]
        expect(standingAt(halves, 150)).toEqual(['bass on', 'treble on'])
        expect(standingAt(halves, 250)).toEqual(['treble on'])
    })

    it('reads the commands in order of place, whatever order they come in', () => {
        expect(standingAt(roll.toReversed(), 150)).toEqual(['mf on'])
    })

    it('lets a second On change nothing while the function stands', () => {
        const twice = [
            expression('first', 'SustainPedalOn', 'treble', 100),
            expression('second', 'SustainPedalOn', 'treble', 150),
            expression('off', 'SustainPedalOff', 'treble', 200)
        ]
        expect(standingAt(twice, 175)).toEqual(['first'])
        expect(standingAt(twice, 225)).toEqual([])
    })

    it('leaves a function on to the end of the roll where nothing cancels it', () => {
        expect(standingAt([expression('soft', 'SoftPedalOn', 'bass', 100)], 10000)).toEqual(['soft'])
    })

    it('lets a cancel with nothing to cancel pass', () => {
        expect(standingAt([expression('off', 'ForzandoOff', 'bass', 100), note('a', 150)], 150)).toEqual([])
    })

    it('latches nothing a bar holds for as long as it is punched', () => {
        expect(standingAt([expression('cresc', 'Crescendo', 'treble', 100)], 101, welteT98)).toEqual([])
    })

    it('latches nothing the bar does not say it switches', () => {
        expect(standingAt([expression('motor', 'MotorOn', 'bass', 100)], 150)).toEqual([])
    })
})
