import { MidiNote, RawPerformance } from "./Performance"
import { Note, Score } from "./Score"
import { SeqNode, Aligner, AlignmentPair, AlignType, GenericSeqNode } from "sequence-align"

/**
 * Note in a sequence
 * 
 * @member label id of the note
 * @member featureVector feature vector: [pitch, onsetTime]
 */
 class NoteNode extends GenericSeqNode<string> {
    featureVector: number[]

    constructor(label: string, featureVector: number[], transTime=0) {
        super(label, transTime)
        this.featureVector = featureVector
    }

    /**
     * compute similarity between two note vector representations
     * @param other the other note to compare with
     * @returns similarity score
     */
    computeSimilarity(other: NoteNode): number {
        function gaussDensity(x: number, m: number, sigma: number) {
            return (1/(Math.sqrt(2*Math.PI*sigma**2)))*Math.exp(-(((x-m)**2)/(2*sigma**2)))
        }
        
        const pitchDistance = Math.abs(this.featureVector[0] - other.featureVector[0])
        const pitchScore = 1/(pitchDistance+1)

        const timeScore = gaussDensity(other.featureVector[1], this.featureVector[1], 3)

        return 0.5 * (pitchScore + timeScore)
    }
}

export class AlignedPerformance {
    score?: Score 
    rawPerformance?: RawPerformance
    aligner: Aligner<string>
    allPairs: AlignmentPair<string>[]
    gapOpen: number 
    gapExt: number

    private byPitch(a: SeqNode<string>, b: SeqNode<string>): number {
        return a.featureVector[0] - b.featureVector[0]
    }

    private treeAlign(performanceNotes: MidiNote[], scoreNotes: Note[]) {
        if (!this.rawPerformance) return 
        if (!this.score) return

        if (performanceNotes.length === 0 || scoreNotes.length === 0) {
            console.log('nothing to do')
            return
        }

        const perfNodes = this.generateSeqNodesFromPerformance(performanceNotes).sort(this.byPitch)
        const scoreNodes = this.
            generateSeqNodesFromScore(
                scoreNotes,
                [performanceNotes[0].onsetTime, performanceNotes[performanceNotes.length-1].onsetTime]) // scale to range
            .sort(this.byPitch)

        this.aligner.align(perfNodes, scoreNodes, { gapOpen: -1, gapExt: -1})
        const allPairs = this.aligner.retrieveAlignments().paths[0]
        this.allPairs.push(...allPairs)
    }

    private generateSeqNodesFromScore(notes: Note[], fitIntoRange: [number, number]): NoteNode[] {
        if (notes.length === 0) return []

        type Range = [number, number]
        function convertRange(value: number, r1: Range, r2: Range) { 
            return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
        }

        const firstQstamp = notes[0].qstamp
        const lastQstamp = notes[notes.length-1].qstamp 
        const scoreRange: Range = [firstQstamp, lastQstamp]

        return notes.map(n => new NoteNode(n.id, [n.pitch, convertRange(n.qstamp, scoreRange, fitIntoRange)]))
    }

    private generateSeqNodesFromPerformance(midiNotes: MidiNote[]): NoteNode[] {
        if (midiNotes.length === 0) return []

        return midiNotes.map((value: MidiNote) => {
            return new NoteNode(value.id.toString(), [value.pitch, value.onsetTime])
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
            this.treeAlign(this.rawPerformance.asNotes(), this.score.allNotes())
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

    public qstampOfOnset(onset: number): number {
        if (!this.ready()) return -1

        const noteAtOnset = this.rawPerformance!.asNotes().find(note => note.onsetTime === onset)
        if (!noteAtOnset) return -1

        const matchingPair = this.getAllPairs().find((pair: AlignmentPair<string>) => {
            return pair[0] === noteAtOnset.id.toString()
        })
        if (!matchingPair) return -1

        const note = this.score!.at(matchingPair[1])
        if (!note) return -1

        return note.qstamp
    }

    public tstampOfOnset(onset: number): number {
        return Score.qstampToTstamp(this.qstampOfOnset(onset))
    }
}
