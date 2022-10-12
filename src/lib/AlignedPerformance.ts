import { MidiNote, RawPerformance } from "./Performance"
import { MeiNote, Mei } from "./Score"
import { ScoreFollower, ErrorDetector } from "alignmenttool/dist/index"
import { ErrorIndex } from "alignmenttool/dist/Match"
import { Visitable } from "./visitors/Visitable"
import { Visitor } from "./visitors/Visitor"

export enum Motivation {
    ExactMatch = "ExactMatch",
    Addition = "Additon",
    Ornamentation = "Ornamentation",
    Alteration = "Alteration",
    OctaveAddition = "OctaveAddition",
    Error = "Error",
    Omission = "Omission",
    Uncertain = "Uncertain"
}

export type SemanticAlignmentPair = {
    scoreNote?: MeiNote,
    midiNote?: MidiNote,
    motivation: Motivation
}

/**
 * Stores a performance aligned to a score and 
 * information about the alignment.
 */
export class AlignedPerformance implements Visitable {
    score?: Mei
    rawPerformance?: RawPerformance
    semanticPairs: SemanticAlignmentPair[]

    constructor(
        score?: Mei,
        rawPerformance?: RawPerformance) {
        this.score = score
        this.rawPerformance = rawPerformance
        this.semanticPairs = []

        this.performAlignment()
    }

    private performAlignment() {
        if (!this.score || !this.rawPerformance) return

        const pr = this.rawPerformance.asPianoRoll()
        const hmm = this.score.asHMM()

        if (pr.events.length === 0 || hmm.events.length === 0) return

        const follower = new ScoreFollower(hmm, 1)
        const matches = follower.getMatchResult(pr)

        const errorDetector = new ErrorDetector(hmm, matches)
        errorDetector.detectErrors()
        const regions = errorDetector.getErrorRegions(0.3)

        console.log('error regions=', regions)

        this.semanticPairs = matches.events.map((event): SemanticAlignmentPair => {
            const scoreId = event.meiId
            const midiId = event.id
            let motivation = Motivation.ExactMatch
            if (event.errorIndex !== ErrorIndex.Correct) {
                motivation = Motivation.Alteration
            }

            return {
                scoreNote: this.score?.getById(scoreId || ''),
                midiNote: this.rawPerformance?.getById(+midiId),
                motivation
            }
        })

        this.semanticPairs = [...this.semanticPairs, ...matches.missingNotes.map((missingNote): SemanticAlignmentPair => {
            return {
                scoreNote: this.score?.getById(missingNote.meiId),
                motivation: Motivation.Omission
            }
        })]
    }

    public setScore(score: Mei) {
        this.score = score
        this.performAlignment()
    }

    public setPerformance(performance: RawPerformance) {
        this.rawPerformance = performance
        this.performAlignment()
    }

    public getSemanticPairs(): SemanticAlignmentPair[] {
        return this.semanticPairs
    }

    /**
     * removes a specific alignment and inserts two orphanes
     * instead (omission/addition)
     * @param pair 
     */
    public removeAlignment(pair: SemanticAlignmentPair) {
        // remove the current alignment
        const index = this.semanticPairs.indexOf(pair)
        this.semanticPairs.splice(index, 1)

        // re-insert the two wrongly matched notes as orphanes
        this.semanticPairs.push({
            scoreNote: pair.scoreNote,
            motivation: Motivation.Omission
        })

        this.semanticPairs.push({
            midiNote: pair.midiNote,
            motivation: Motivation.Addition
        })
    }

    /**
     * removes all alignments and inserts orphanes instead.
     */
    public removeAllAlignments() {
        this.semanticPairs
            .filter(pair => pair.scoreNote !== undefined && pair.midiNote !== undefined) // don't make an orphane if it is already one
            .forEach(pair => this.removeAlignment(pair))
    }

    /**
     * Updates the motivation of a specific alignment
     * @param pair 
     * @param target 
     */
    updateMotivation(pair: SemanticAlignmentPair, target: Motivation) {
        const index = this.semanticPairs.indexOf(pair)
        if (index >= 0) {
            this.semanticPairs[index].motivation = target
        }
    }

    /**
     * aligns a MIDI and a score note and tries to determine
     * its motivation as possible.
     * 
     * @param midiNote 
     * @param scoreNote 
     */
    public align(midiNote: MidiNote, scoreNote: MeiNote, motivation: Motivation = Motivation.Uncertain) {
        // remove orphanes
        const orphanMidiNoteIndex = this.semanticPairs.findIndex(pair => pair.midiNote === midiNote && pair.motivation === Motivation.Addition)
        if (orphanMidiNoteIndex !== -1) this.semanticPairs.splice(orphanMidiNoteIndex, 1)

        const orphanScoreNoteIndex = this.semanticPairs.findIndex(pair => pair.scoreNote === scoreNote && pair.motivation === Motivation.Omission)
        if (orphanScoreNoteIndex !== -1) this.semanticPairs.splice(orphanScoreNoteIndex, 1)

        // insert new pair and try to determine its possible motivation
        if (scoreNote.pnum === midiNote.pitch) {
            motivation = Motivation.ExactMatch
        }
        else {
            motivation = Motivation.Alteration
        }

        this.semanticPairs.push({
            scoreNote,
            midiNote,
            motivation
        })
    }

    public accept(visitor: Visitor) {
        visitor.visitAlignment(this)
    }

    /**
     * Returns the performed note for a given score note
     * @param id MEI id of the given score note
     * @param part 
     * @returns 
     */
    public performedNoteAtId(id: string, part?: number): MidiNote | null {
        return this.semanticPairs.find(pair => pair.scoreNote?.id === id)?.midiNote || null
    }

    public performedNotesAtQstamp(qstamp: number, part?: number): MidiNote[] {
        return this.semanticPairs
            .filter(alignmentPair => alignmentPair.scoreNote?.qstamp === qstamp && alignmentPair.midiNote)
            .map(alignmentPair => alignmentPair.midiNote!)
    }

    public ready(): boolean {
        return !!this.score && !!this.rawPerformance
    }
}

