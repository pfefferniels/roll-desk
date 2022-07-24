import { MidiNote, RawPerformance } from "./Performance"
import { Note, Score } from "./Score"
import { SeqNode, Aligner, AlignmentPair, AlignType, GenericSeqNode } from "sequence-align"

type Range = [number, number]
function convertRange(value: number, r1: Range, r2: Range) {
    return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
}

export enum Motivation {
    ExactMatch = "ExactMatch",
    Addition = "Additon",
    Ornamentation = "Ornamentation",
    OctaveAlteration = "OctaveAlteration",
    OctaveDoubling = "OctaveDoubling",
    Error = "Error",
    Omission = "Omission",
    Uncertain = "Uncertain"
}

export type SemanticAlignmentPair = {
    scoreNote?: Note,
    midiNote?: MidiNote,
    motivation: Motivation
}

/**
 * Note in a sequence
 * 
 * @member label id of the note
 * @member featureVector feature vector: [pitch, onsetTime]
 */
class NoteNode extends GenericSeqNode<string> {
    featureVector: number[]

    constructor(label: string, featureVector: number[], transTime = 0) {
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
            return (1 / (Math.sqrt(2 * Math.PI * sigma ** 2))) * Math.exp(-(((x - m) ** 2) / (2 * sigma ** 2)))
        }

        const pitchDistance = Math.abs(this.featureVector[0] - other.featureVector[0])
        const pitchScore = 1 / (pitchDistance + 1)

        const timeScore = convertRange(
            gaussDensity(other.featureVector[1], this.featureVector[1], 3),
            [0, 1],
            [-1, 1])

        return timeScore
    }
}

export class AlignedPerformance {
    score?: Score
    rawPerformance?: RawPerformance
    aligner: Aligner<string>
    rawPairs: AlignmentPair<string>[]
    semanticPairs: SemanticAlignmentPair[]
    gapOpen: number
    gapExt: number

    private byPitch(a: NoteNode, b: NoteNode): number {
        return (a.featureVector[0] - b.featureVector[0]) || (b.featureVector[1] - a.featureVector[1])
    }

    private generateSeqNodesFromScore(notes: Note[], fitIntoRange: [number, number]): NoteNode[] {
        if (notes.length === 0) return []

        const firstQstamp = notes[0].qstamp
        const lastQstamp = notes[notes.length - 1].qstamp
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
        this.rawPairs = []
        this.semanticPairs = []

        this.performAlignment()
    }

    private performAlignment() {
        if (!this.score || !this.rawPerformance) return

        const performanceNotes = this.rawPerformance.asNotes()
        const scoreNotes = this.score.allNotes()

        if (performanceNotes.length === 0 || scoreNotes.length === 0) return

        // experimental: generate lookup function
        // this might be useful for a more precise time alignment later on.
        {
            const perfNodes = this.generateSeqNodesFromPerformance(performanceNotes)
            const scoreNodes = this.
                generateSeqNodesFromScore(
                    scoreNotes,
                    [performanceNotes[0].onsetTime, performanceNotes[performanceNotes.length - 1].onsetTime])

            let avg1: SeqNode<string>[] = []
            const windowSize = 5
            for (let i = 0; i < perfNodes.length - windowSize; i++) {
                let avg = 0;
                for (let j = 0; j < windowSize; j++) {
                    avg += perfNodes[i + windowSize].featureVector[0]
                }
                avg = Math.pow(windowSize, 1 / avg)
                avg1.push(new SeqNode<string>(perfNodes[i].featureVector[1].toString(), [avg]))
            }

            let avg2: SeqNode<string>[] = []
            for (let i = 0; i < scoreNodes.length - windowSize; i++) {
                let avg = 0;
                for (let j = 0; j < windowSize; j++) {
                    avg += scoreNodes[i + windowSize].featureVector[0]
                }
                avg = Math.pow(windowSize, 1 / avg)
                avg2.push(new SeqNode<string>(scoreNodes[i].featureVector[1].toString(), [avg]))
            }

            this.aligner.align(avg1, avg2, { gapOpen: -0.5, gapExt: -1 })
            const allPairs = this.aligner.retrieveAlignments().paths[0]
        }

        const perfNodes = this.generateSeqNodesFromPerformance(performanceNotes).sort(this.byPitch)
        const scoreNodes = this.
            generateSeqNodesFromScore(
                scoreNotes,
                [performanceNotes[0].onsetTime, performanceNotes[performanceNotes.length - 1].onsetTime]) // scale to range
            .sort(this.byPitch)

        this.aligner.align(perfNodes, scoreNodes, { gapOpen: -1, gapExt: -1 })
        const allPairs = this.aligner.retrieveAlignments().paths[0]
        this.rawPairs.push(...allPairs)

        this.semanticPairs = allPairs.map((pair): SemanticAlignmentPair => {
            const scoreId = pair[1]
            const midiId = pair[0]

            if (scoreId === '-') {
                return {
                    midiNote: this.rawPerformance?.at(+midiId),
                    motivation: Motivation.Addition,
                }
            }
            else if (midiId === '-') {
                return {
                    scoreNote: this.score?.at(scoreId),
                    motivation: Motivation.Omission,
                }
            }
            else {
                return {
                    scoreNote: this.score?.at(scoreId),
                    midiNote: this.rawPerformance?.at(+midiId),
                    motivation: Motivation.ExactMatch
                }
            }
        })
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
        return this.rawPairs
    }

    public setPairs(pairs: AlignmentPair<string>[]) {
        this.rawPairs = pairs
    }

    public getSemanticPairs(): SemanticAlignmentPair[] {
        return this.semanticPairs
    }

    /**
     * This function generates RDF triples out of the Alignment
     * data. 
     * 
     * @todo should it also include the exports of Score and RawPerformance?
     * @returns string of RDF triples in JSON-LD format.
     */
    public serializeToRDF(carriedOutBy: string = ''): string {
        if (!this.semanticPairs.length) return ''

        const result = {
            "@context": {
                // define namespaces here
                "la": "http://example.org/linked_alignment#",
                "crm": "http://www.cidoc-crm.org/cidoc-crm/",
                "xsd": "http://www.w3.org/2001/XMLSchema#",
            },
            "@graph": [
                {
                    "@id": "http://example.org/my-alignment",
                    "@type": "la:Alignment",
                    "crm:P14_carried_out_by": {
                        "@id": `http://example_org/${carriedOutBy}`,
                        "@type": "E39_Actor"
                    },
                    "dcterms:created": new Date(Date.now()).toISOString(),
                    "la:hasAlignmentPair": this.semanticPairs.map((pair, i) => `http//example.org/my-alignment/pair_${i}`)
                },
                ...this.semanticPairs.map((pair, i) => {
                    const result: any = {
                        "@id": `http://example.org/my-alignment/pair_${i}`,
                        "@type": "la:AlignmentPair",
                        "la:hasMotivation": `http://example.org/alignment-motivation#${pair.motivation}`
                    }
                    if (pair.scoreNote) {
                        result["la:hasScoreNote"] = `http://example.org/my-alignment/score.mei#${pair.scoreNote.id}`
                    }
                    if (pair.midiNote) {
                        result["la:hasMIDINote"] = `http://example.org/midi/a-performance/track_0/event_${pair.midiNote.id}`
                    }

                    return result
                }),
            ]
        }

        return JSON.stringify(result, null, 4)
    }

    public noteAtId(id: string) {
        return this.score?.at(id)
    }

    public performedNoteAtIndex(index: number): MidiNote | null {
        return this.rawPerformance?.at(index) || null
    }

    public performedNoteAtId(id: string, part?: number): MidiNote | null {
        const pair = this.rawPairs.find((value: AlignmentPair<string>) => {
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
            const pair = this.rawPairs.find((pair: AlignmentPair<string>) => pair[1] === note.id)
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
