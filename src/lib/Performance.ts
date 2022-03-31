import { AnyEvent, MidiFile, NoteOffEvent, NoteOnEvent, SetTempoEvent } from 'midifile-ts';

export type MidiNote = {
    onsetTime: number,
    pitch: number,
    velocity: number
}

/**
 * wrapper for a raw MIDI performance
 */
export class RawPerformance {
    midi: MidiFile | null

    constructor(performance: MidiFile) {
        this.midi = performance
    }

    public asNotes(): MidiNote[] {
        if (!this.midi) return []

        // find time per tick
        const microsecondsPerBeat: number =
            (this.midi.tracks[0].find((event: AnyEvent) => (event as SetTempoEvent).subtype === "setTempo") as SetTempoEvent).microsecondsPerBeat
        if (!microsecondsPerBeat) return []

        const BPM = 60000000 / microsecondsPerBeat
        const realTimePerBeat = 60/BPM
        const ticksPerBeat = this.midi.header.ticksPerBeat
        const tickTime = realTimePerBeat / ticksPerBeat
        console.log('tickTime=', tickTime)

        return this.midi.tracks[0].filter((event: AnyEvent) => {
            return (event as NoteOnEvent).noteNumber !== undefined &&
                   !((event as NoteOffEvent).subtype === "noteOff")
        }).reduce((acc, event, currIndex) => {
            const midiNote: MidiNote = {
                onsetTime: (acc[currIndex-1]?.onsetTime || 0) + tickTime * event.deltaTime,
                pitch: (event as NoteOnEvent).noteNumber || 0,
                velocity: (event as NoteOnEvent).velocity || 0
            }
            acc.push(midiNote)
            return acc
        }, new Array<MidiNote>())
    }

    public at(index: number): MidiNote | null {
        const note = this.asNotes()[index]
        if (!note) console.log("Element at index", index, "does not exist")
        return note || null
    }
}

