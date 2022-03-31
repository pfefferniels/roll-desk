import { AnyEvent, MidiFile, NoteOffEvent, NoteOnEvent } from 'midifile-ts';
import { ConstructionOutlined } from '@mui/icons-material';

export type MidiNote = {
    onsetTime: number,
    pitch: number,
    velocity: number
}

/**
 * wrapper for a raw MIDI performance
 */
export class RawPerformance {
    midi?: MidiFile | null

    constructor(performance?: MidiFile | null) {
        this.midi = performance
    }

    public asNotes(): MidiNote[] {
        if (!this.midi) return []
        return this.midi.tracks[0].filter((event: AnyEvent) => {
            return (event as NoteOnEvent).noteNumber !== undefined &&
                   !((event as NoteOffEvent).subtype === "noteOff")
        }).reduce((acc, event, currIndex) => {
            const midiNote: MidiNote = {
                onsetTime: (acc[currIndex-1]?.onsetTime || 0) + event.deltaTime,
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

