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

    private getTickTimeForTempoEvent(event: SetTempoEvent) {
        const microsecondsPerBeat = event.microsecondsPerBeat
        if (!microsecondsPerBeat || !this.midi) return -1

        const BPM = 60000000 / microsecondsPerBeat
        const realTimePerBeat = 60 / BPM
        const ticksPerBeat = this.midi.header.ticksPerBeat
        return realTimePerBeat / ticksPerBeat
    }

    public asNotes(): MidiNote[] {
        if (!this.midi) return []

        const isNoteOn = (event: AnyEvent) => (event as NoteOnEvent).subtype === "noteOn"
        const isNoteOff = (event: AnyEvent) => (event as NoteOffEvent).subtype === "noteOff"
        const isSetTempo = (event: AnyEvent) => (event as SetTempoEvent).subtype === "setTempo"

        let result: MidiNote[] = []
        let currentTime = 0
        let currentTickTime = 0

        this.midi.tracks.forEach((events: AnyEvent[]) => {
            events.forEach((event: AnyEvent, index: number) => {
                currentTime += event.deltaTime

                if (isSetTempo(event)) {
                    currentTickTime = this.getTickTimeForTempoEvent(event as SetTempoEvent)
                }
                else if (isNoteOn(event)) {
                    const noteOnEvent = event as NoteOnEvent

                    result.push({
                        id: index,
                        onsetTime: currentTickTime * currentTime,
                        pitch: noteOnEvent.noteNumber || 0,
                        velocity: noteOnEvent.velocity || 0,
                        duration: 0
                    })
                }
                else if (isNoteOff(event)) {
                    const noteOffEvent = event as NoteOffEvent
                    const correspNote = result.slice().reverse().find(note => note.pitch === noteOffEvent.noteNumber)
                    if (!correspNote) {
                        console.log('no corresponding noteOn event found for noteOff', noteOffEvent)
                        return
                    }
                    correspNote.duration = (currentTickTime * currentTime) - correspNote.onsetTime
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

    public getById(id: number): MidiNote | undefined {
        return this.asNotes().find(note => note.id === id)
    }

    public accept(visitor: Visitor) {
        return visitor.visitPerformance(this)
    }
}

