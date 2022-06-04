import { AnyEvent, MidiFile, NoteOffEvent, NoteOnEvent, SetTempoEvent } from 'midifile-ts';

export type MidiNote = {
    id: number,
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

    /**
     * Returns the first and the last onset time of this performance.
     * @returns pair of numbers with lower onset and upper onset
     */
    public range(): [number, number] {
        const performedNotes = this.asNotes()
        const firstOnset = performedNotes[0].onsetTime
        const lastOnset = performedNotes[performedNotes.length-1].onsetTime
        return [firstOnset, lastOnset]
    }

    public asNotes(): MidiNote[] {
        if (!this.midi) return []

        //console.log('collecting from', this.midi)

        // find time per tick
        const microsecondsPerBeat: number =
            (this.midi.tracks[0].find((event: AnyEvent) => (event as SetTempoEvent).subtype === "setTempo") as SetTempoEvent).microsecondsPerBeat
        if (!microsecondsPerBeat) return []

        const BPM = 60000000 / microsecondsPerBeat
        const realTimePerBeat = 60/BPM
        const ticksPerBeat = this.midi.header.ticksPerBeat
        const tickTime = realTimePerBeat / ticksPerBeat

        const mergedTracks = [...this.midi.tracks].flat()
        //console.log('mergedTracks=', mergedTracks)

        return mergedTracks.filter((event: AnyEvent) => {
            return (event as NoteOnEvent).noteNumber !== undefined &&
                   !((event as NoteOffEvent).subtype === "noteOff")
        }).reduce((acc, event, currIndex) => {
            const midiNote: MidiNote = {
                id: currIndex,
                onsetTime: (acc[currIndex-1]?.onsetTime || 0) + tickTime * event.deltaTime,
                pitch: (event as NoteOnEvent).noteNumber || 0,
                velocity: (event as NoteOnEvent).velocity || 0
            }
            acc.push(midiNote)
            return acc
        }, new Array<MidiNote>())
    }

    public at(id: number): MidiNote | undefined {
        return this.asNotes().find(note => note.id === id)
    }
}

