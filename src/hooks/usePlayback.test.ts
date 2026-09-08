import { describe, expect, it } from 'vitest'
import type { AbsoluteEvent, Schedule } from 'react-pianosound'
import { lastNoteAt } from './usePlayback'

const noteOff = (abs: number): AbsoluteEvent => ({
    type: 'channel', subtype: 'noteOff', channel: 0, noteNumber: 60, velocity: 127, deltaTime: 0, abs
})

const pedalUp = (abs: number): AbsoluteEvent => ({
    type: 'channel', subtype: 'controller', channel: 0, controllerType: 64, value: 0, deltaTime: 0, abs
})

const scheduleOf = (events: AbsoluteEvent[], offset = 0): Schedule => ({
    events,
    offset,
    from: offset,
    fromIndex: 0,
    stateAtFrom: { notes: new Map(), controllers: new Map() }
})

describe('the moment a schedule plays its last note', () => {
    it('is where that note is released', () => {
        expect(lastNoteAt(scheduleOf([noteOff(1000), noteOff(4500)]))).toBe(4.5)
    })

    it('leaves the silent events of the rest of the roll out of it', () => {
        expect(lastNoteAt(scheduleOf([noteOff(4500), pedalUp(300000)]))).toBe(4.5)
    })

    it('is read on the transport clock the schedule sits on', () => {
        expect(lastNoteAt(scheduleOf([noteOff(4500)], 10))).toBe(14.5)
    })

    it('is where a schedule holding no note begins', () => {
        expect(lastNoteAt(scheduleOf([pedalUp(300000)], 10))).toBe(10)
    })
})
