import { PianoRoll, pitchToSitch } from 'alignmenttool';
import { AnyEvent, MidiFile, NoteOffEvent, NoteOnEvent, SetTempoEvent, TextEvent } from 'midifile-ts';
import { uuid } from '../globals';
import { RdfEntity } from '../rdf';
import { Visitable } from '../visitors/Visitable';
import { Visitor } from '../visitors/Visitor';

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
export class RawPerformance extends RdfEntity implements Visitable {
    midi: MidiFile | null
    metadata: TextEvent[]

    constructor(performance: MidiFile) {
        super()
        this.midi = performance
        this.metadata = []
        if (performance.tracks.length > 0) {
            const textEvents = performance.tracks.flat().filter(e => e.type === 'meta' && e.subtype === 'text') as TextEvent[]
            this.metadata = textEvents
        }
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

    /**
     * Finds the MIDI note which is the closest to a given
     * onset time.
     * 
     * @param goalTime 
     * @returns 
     */
    public nearestNote(goalTime: number): MidiNote | undefined {
        const nearestNote = this.asNotes().reduce((prev, curr) => {
            return (Math.abs(curr.onsetTime - goalTime) < Math.abs(prev.onsetTime - goalTime) ? curr : prev);
        })
        return nearestNote
    }

    public totalDuration(): number | undefined {
        const lastNote = this.asNotes().at(-1)
        if (!lastNote) return
        return lastNote.onsetTime + lastNote.duration
    }

    public getMetadata() {
        return this.metadata
    }

    public accept(visitor: Visitor) {
        return visitor.visitPerformance(this)
    }
}

