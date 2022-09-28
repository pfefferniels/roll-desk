import { PianoRoll, pitchToSitch } from 'alignmenttool';
import { AnyEvent, MidiFile, NoteOffEvent, NoteOnEvent, SetTempoEvent } from 'midifile-ts';
import { Visitable } from './visitors/Visitable';
import { Visitor } from './visitors/Visitor';

export type MidiNote = {
    id: number,
    onsetTime: number,
    pitch: number,
    velocity: number,
    duration: number
}

/**
 * wrapper for a raw MIDI performance
 */
export class RawPerformance implements Visitable {
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
        const lastOnset = performedNotes[performedNotes.length - 1].onsetTime
        return [firstOnset, lastOnset]
    }

    public asNotes(): MidiNote[] {
        if (!this.midi) return []

        const isNoteOn = (event: AnyEvent) => (event as NoteOnEvent).subtype === "noteOn"
        const isNoteOff = (event: AnyEvent) => (event as NoteOffEvent).subtype === "noteOff"

        // find time per tick
        const microsecondsPerBeat: number =
            (this.midi.tracks[0].find((event: AnyEvent) => (event as SetTempoEvent).subtype === "setTempo") as SetTempoEvent).microsecondsPerBeat
        if (!microsecondsPerBeat) return []

        const BPM = 60000000 / microsecondsPerBeat
        const realTimePerBeat = 60 / BPM
        const ticksPerBeat = this.midi.header.ticksPerBeat
        const tickTime = realTimePerBeat / ticksPerBeat

        let result: MidiNote[] = []
        let currentTime = 0
        this.midi.tracks.forEach((events: AnyEvent[]) => {
            events.slice(1).forEach((event: AnyEvent, index: number, array: AnyEvent[]) => {
                if (isNoteOn(event)) {
                    const noteOnEvent = event as NoteOnEvent
                    currentTime += noteOnEvent.deltaTime

                    result.push({
                        id: index,
                        onsetTime: tickTime * currentTime,
                        pitch: noteOnEvent.noteNumber || 0,
                        velocity: noteOnEvent.velocity || 0,
                        duration: 0
                    })
                }
                else if (isNoteOff(event)) {
                    const noteOffEvent = event as NoteOffEvent
                    currentTime += noteOffEvent.deltaTime
                    const correspNote = result.slice().reverse().find(note => note.pitch === noteOffEvent.noteNumber)
                    if (!correspNote) {
                        console.log('no corresponding noteOn event found for noteOff', noteOffEvent)
                        return
                    }
                    correspNote.duration = (tickTime * currentTime) - correspNote.onsetTime
                }
            })
        })

        return result
    }

    public asPianoRoll(): PianoRoll {
        const pr = new PianoRoll()
        pr.events = this.asNotes().map(note => {
            return {
                ontime: note.onsetTime,
                offtime: note.onsetTime + note.duration,
                id: note.id.toString(),
                pitch: note.pitch,
                sitch: pitchToSitch(note.pitch),
                onvel: 80,
                offvel: 80,
                channel: 1,
                endtime: note.onsetTime + note.duration,
                label: note.id.toString()
            }
        })
        
        return pr
    }

    public at(id: number): MidiNote | undefined {
        return this.asNotes().find(note => note.id === id)
    }

    public accept(visitor: Visitor) {
        return visitor.visitPerformance(this)
    }
}

