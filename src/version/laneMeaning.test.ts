import { describe, expect, it } from 'vitest'
import { welteT100, welteT98 } from 'linked-rolls'
import type { Expression, Note } from 'linked-rolls'
import { laneMeaning } from './laneMeaning'

const note = (pitch: number) => ({ type: 'note', pitch }) as Note
const expression = (expressionType: string, scope: 'bass' | 'treble') =>
    ({ type: 'expression', expressionType, scope }) as Expression

describe('what a lane means on the bar', () => {
    it('names the note a lane sounds, with the track it lies on', () => {
        expect(laneMeaning(note(60), welteT100)).toEqual({ meaning: 'C4', track: welteT100.positionOf(note(60)) })
        expect(laneMeaning(note(54), welteT100)?.meaning).toBe('F♯3')
    })

    it('words a valve and names the half it serves', () => {
        expect(laneMeaning(expression('MezzoforteOn', 'bass'), welteT100)?.meaning).toBe('Mezzoforte on, bass')
        expect(laneMeaning(expression('SlowCrescendoOff', 'treble'), welteT100)?.meaning).toBe('Slow crescendo off, treble')
    })

    it('leaves out the half for what serves the whole keyboard', () => {
        expect(laneMeaning(expression('SustainPedalOn', 'treble'), welteT100)?.meaning).toBe('Sustain pedal on')
        expect(laneMeaning(expression('Rewind', 'treble'), welteT100)?.meaning).toBe('Rewind')
    })

    it('says where the bar holds a function for as long as it is punched', () => {
        expect(laneMeaning(expression('Crescendo', 'treble'), welteT98)?.meaning).toBe('Crescendo (held), treble')
    })

    it('reads the track off the bar the command is drawn by', () => {
        const pedal = expression('SustainPedalOn', 'treble')
        expect(laneMeaning(pedal, welteT100)?.track).toBe(welteT100.positionOf(pedal))
    })

    it('says nothing of a command the bar does not read', () => {
        expect(laneMeaning(expression('SustainPedalOn', 'treble'), welteT98)).toBeUndefined()
    })
})
