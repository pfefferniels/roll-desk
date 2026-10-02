import { describe, expect, it } from 'vitest'
import type { AbsoluteEvent, Schedule } from 'react-pianosound'
import { endOf } from './usePlayback'

const noteOff = (abs: number): AbsoluteEvent => ({
    type: 'channel', subtype: 'noteOff', channel: 0, noteNumber: 60, velocity: 127, deltaTime: 0, abs
})

const sustain = (value: number) => (abs: number): AbsoluteEvent => ({
    type: 'channel', subtype: 'controller', channel: 0, controllerType: 64, value, deltaTime: 0, abs
})

const pedalDown = sustain(127)
const pedalUp = sustain(0)

const softPedal = (abs: number): AbsoluteEvent => ({
    type: 'channel', subtype: 'controller', channel: 0, controllerType: 67, value: 127, deltaTime: 0, abs
})

const scheduleOf = (events: AbsoluteEvent[], offset = 0): Schedule => ({
    events,
    offset,
    from: offset,
    fromIndex: 0,
    stateAtFrom: { notes: new Map(), controllers: new Map() }
})

describe('the moment a schedule has done sounding', () => {
    it('is where its last note is released', () => {
        expect(endOf(scheduleOf([noteOff(1000), noteOff(4500)]))).toBe(4.5)
    })

    it('leaves the silent events of the rest of the roll out of it', () => {
        expect(endOf(scheduleOf([noteOff(4500), softPedal(6000), pedalDown(7000), pedalUp(300000)]))).toBe(4.5)
    })

    it('is where the pedal lets go of a last note it holds on', () => {
        expect(endOf(scheduleOf([pedalDown(4000), noteOff(4500), sustain(100)(5000), sustain(40)(6000), pedalDown(7000), pedalUp(300000)]))).toBe(6)
    })

    it('is the end of the schedule where the pedal never lets go of the last note', () => {
        expect(endOf(scheduleOf([pedalDown(4000), noteOff(4500), softPedal(8000)]))).toBe(8)
    })

    it('is read on the transport clock the schedule sits on', () => {
        expect(endOf(scheduleOf([noteOff(4500)], 10))).toBe(14.5)
    })

    it('is where a schedule holding no note begins', () => {
        expect(endOf(scheduleOf([pedalUp(300000)], 10))).toBe(10)
    })
})
