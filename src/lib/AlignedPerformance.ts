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

    private generateSeqNodesFromScore(): NoteNode[] {
        const notes = this.score?.allNotes()
        if (!notes) return []

        return notes.map((value: Note, index: number, arr: Note[]) => {
            return new NoteNode(value.id, value.pitch)
        })
    }

    private generateSeqNodesFromPerformance(): NoteNode[] {
        const midiNotes = this.rawPerformance?.asNotes()
        if (!midiNotes) return []

        return midiNotes.map((value: MidiNote, index: number, arr: MidiNote[]) => {
            return new NoteNode(index.toString(), value.pitch)
        })
    }

    constructor(
        gapOpen?: number,
        gapExt?: number,
        score?: Score,
        rawPerformance?: RawPerformance) {
        this.gapOpen = gapOpen || -1
        this.gapExt = gapExt || -1
        this.score = score
        this.rawPerformance = rawPerformance
        this.aligner = new Aligner<string>(AlignType.Global) // really global
        this.allPairs = []
        this.performAlignment()
    }

    private performAlignment() {
        if (this.score && this.rawPerformance) {
            // align pitches of score and performance
            this.aligner.align(this.generateSeqNodesFromPerformance(), this.generateSeqNodesFromScore(), {
                gapOpen: this.gapOpen, gapExt: this.gapExt
            })
            this.allPairs = this.aligner.retrieveAlignments().paths[0]
            this.identifyAndCorrectErrorRegions()
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

    private identifyAndCorrectErrorRegions() {
        const getPitchPairFor = (index: number): [number, number] => {
            return [this.rawPerformance?.at(Number(this.allPairs[index][0]))?.pitch || -1,
                    this.score?.at(this.allPairs[index][1])?.pitch || -1]
        }

        let start = 0;
        for (let i=1; i<this.allPairs.length-1; i++) {
            let prev = getPitchPairFor(i-1)
            let curr = getPitchPairFor(i)
            let next = getPitchPairFor(i+1)

            // start
            if (prev[0] === prev[1] && curr[0] !== curr[1] && next[0] !== next[1]) {
                start = i
            }
            // end
            else if (prev[0] !== prev[1] && curr[0] !== curr[1] && next[0] === next[1]) {
                // try to find better matches
                let slice = this.allPairs.slice(start, i+1) // slice excludes the last element
                // slice[0] und [1] sortieren nach pitches
                // identisch? dann neu zuordnen

                for (let j=start; j<i; j++) {
                    for (let k=0; k<slice.length; k++) {
                        if (getPitchPairFor(j)[0] === getPitchPairFor(j+k)[1] &&
                            getPitchPairFor(j)[1] === getPitchPairFor(j+k)[0]) {
                            console.log(this.allPairs[j], '-', this.allPairs[j+k])
                            // swap
                            let tmp = this.allPairs[j][1]
                            this.allPairs[j][1] = this.allPairs[j+k][1]
                            this.allPairs[j+k][1] = tmp
                        }
                    }
                }
            }
        }
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
