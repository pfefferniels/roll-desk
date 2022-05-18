//import { NeedlemanWunsch, Pair } from "./NeedlemanWunsch"
import { MidiNote, RawPerformance } from "./Performance"
import { Note, Score } from "./Score"
import { SeqNode, GenericSeqNode, Aligner, AlignmentPair, AlignType } from "sequence-align"

class NoteNode extends GenericSeqNode<string> {
    pitch: number

    constructor(label: string, pitch: number) {
        super(label)
        this.pitch = pitch
    }

    computeSimilarity(otherNode: NoteNode): number {
        // inflict less severe punishment on octave displacement
        if (otherNode.pitch === this.pitch) return 2
        return -2
    }
}

export class AlignedPerformance {
    score?: Score 
    rawPerformance?: RawPerformance
    aligner: Aligner<string>
    allPairs: AlignmentPair<string>[]
    gapOpen: number 
    gapExt: number

    private generateSeqNodesFromScore(): SeqNode<string>[] {
        const notes = this.score?.allNotes()
        if (!notes) return []

        type Range = [number, number]
        function convertRange(value: number, r1: Range, r2: Range) { 
            return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
        }
        const performedNotes = this.rawPerformance?.asNotes()
        if (!performedNotes) {
            console.log('need to know how to scale')
            return []
        }

        const firstQstamp = notes[0].qstamp
        const lastQstamp = notes[notes.length-1].qstamp 
        const scoreRange: Range = [firstQstamp, lastQstamp]

        const firstOnset = performedNotes[0].onsetTime
        const lastOnset = performedNotes[performedNotes.length-1].onsetTime
        const performanceRange: Range = [firstOnset, lastOnset]

        return notes.map(n => new SeqNode(n.id, [n.pitch, convertRange(n.qstamp, scoreRange, performanceRange)]))
        
        /*const notes = this.score?.allNotes()
        if (!notes) return []

        return notes.map((value: Note, index: number, arr: Note[]) => {
            return new NoteNode(value.id, value.pitch)
        })*/
    }

    private generateSeqNodesFromPerformance(): SeqNode<string>[] {
        const midiNotes = this.rawPerformance?.asNotes()
        if (!midiNotes) return []

        return midiNotes.map((value: MidiNote, index: number, arr: MidiNote[]) => {
            return new SeqNode(index.toString(), [value.pitch, value.onsetTime])
        })

        /*const midiNotes = this.rawPerformance?.asNotes()
        if (!midiNotes) return []

        return midiNotes.map((value: MidiNote, index: number, arr: MidiNote[]) => {
            return new NoteNode(index.toString(), value.pitch)
        })*/
    }

    constructor(
        gapOpen?: number,
        gapExt?: number,
        score?: Score,
        rawPerformance?: RawPerformance) {
        this.gapOpen = gapOpen || -3
        this.gapExt = gapExt || -1
        this.score = score
        this.rawPerformance = rawPerformance
        this.aligner = new Aligner<string>(AlignType.Global) // really global
        this.allPairs = []
        this.performAlignment()
    }

    private performAlignment() {
        const compareSeqNodes = (a: SeqNode<string>, b: SeqNode<string>): number => {
            return a.featureVector[0] - b.featureVector[0]
        }
        if (this.score && this.rawPerformance) {
            // align pitches of score and performance
            const performanceNodes = this.generateSeqNodesFromPerformance().sort(compareSeqNodes)
            const scoreNodes = this.generateSeqNodesFromScore().sort(compareSeqNodes)
            this.aligner.align(performanceNodes, scoreNodes, {
                gapOpen: this.gapOpen, gapExt: this.gapExt
            })
            this.allPairs = this.aligner.retrieveAlignments().paths[0]
        }
    }

    public setScore(score: Score) {
        this.score = score
        this.performAlignment()
    }

    public setPerformance(performance: RawPerformance) {
        this.rawPerformance = performance 
        this.performAlignment()
    }

    public setGapOpen(gapOpen: number) {
        this.gapOpen = gapOpen
    }

    public setGapExt(gapExt: number) {
        this.gapExt = gapExt
    }

    public getAllPairs(): AlignmentPair<string>[] {
        return this.allPairs
    }

    public noteAtId(id: string) {
        return this.score?.at(id)
    }

    public performedNoteAtIndex(index: number): MidiNote | null {
        return this.rawPerformance?.at(index) || null
    }

    public performedNoteAtId(id: string, part?: number): MidiNote | null {
        const pair = this.allPairs.find((value: AlignmentPair<string>) => {
            return value[1] === id
        })
        if (pair) return this.rawPerformance?.at(Number(pair[0])) || null
        return null
    }

    public performedNotesAtQstamp(qstamp: number, part?: number): MidiNote[] {
        const notes = this.score?.notesAtTime(qstamp)
        if (!notes) return []

        const midiNotes: MidiNote[] = []
        for (const note of notes) {
            // find this note id in the aligned pairs
            const pair = this.allPairs.find((pair: AlignmentPair<string>) => pair[1] === note.id)
            if (pair && pair[0] !== '-') {
                const midiNote = this.rawPerformance?.at(Number(pair[0]))
                if (midiNote) midiNotes.push(midiNote)
            }
        }
        return midiNotes
    }

    public ready(): boolean {
        return !!this.score && !!this.rawPerformance
    }

    public qstampOfOnset(onset: number): number | undefined {
        if (!this.ready()) return 

        const midiIndex = this.rawPerformance!.asNotes().findIndex(note => note.onsetTime === onset)
        if (midiIndex === -1) return

        const matchingPair = this.getAllPairs().find((pair: AlignmentPair<string>) => {
            return pair[0] === midiIndex.toString()
        })
        if (!matchingPair) return

        const note = this.score!.at(matchingPair[1])
        if (!note) return 

        return note.qstamp
    }

    // Helper functions
    /*private midiIndexForScoreIndex(scoreIndex: number) {
        const correspRows = this.alignments.filter(a => a.scoreIndex === scoreIndex)
        if (!correspRows.length) return -1
        return correspRows[0]['MIDI_INDEX']
    }*/

    private midiIndicesByQstamp(qstamp: number) {
        //const notes = this.score.notesAtTime(qstamp)
        //const midiIndices = notes.map(note => this.alignment.midiIndexOfScoreIndex(note.index))
        //return midiIndices
    }
}
