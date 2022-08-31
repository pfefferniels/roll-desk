import { Score } from "./Score";
import { AlignedPerformance } from "./AlignedPerformance";
import { Part } from "./Mpm";

/**
 * Temporary attributes used and manipulated in the process of interpolation.
 */
type TemporaryAttributes = {
    readonly 'midi.pitch': number,
    'midi.onset': number,
    'midi.duration': number,
    'midi.velocity': number,
    'bpm'?: number,
    'bpm.beatLength'?: number
}

/**
 * Represents a score note as part of an MSM encoding. 
 * During the process of MPM generation several temporary 
 * attributes will be attached to it.
 */
export type MsmNote = {
    readonly 'xml:id': string,
    readonly 'part': number,
    readonly 'date': number,
    readonly 'duration': number
    readonly pitchname: string
    readonly accidentals: number
    readonly octave: number
} & TemporaryAttributes

/**
 * Used to represent a homophonized version of the score.
 */
export type Chords = {
    [tstamp: number]: MsmNote[]
}

/**
 * This class represents an MSM encoding.
 */
export class MSM {
    allNotes: MsmNote[]

    /**
     * Constructs an MSM representation from a done
     * score-to-performance alignment. 
     * 
     * @param alignedPerformance 
     */
    constructor(alignedPerformance: AlignedPerformance) {
        this.allNotes = alignedPerformance.getSemanticPairs()
            .filter(pair => pair.midiNote && pair.scoreNote)
            .map(pair => {
                return {
                    part: pair.scoreNote!.part,
                    'xml:id': pair.scoreNote!.id,
                    'date': Score.qstampToTstamp(pair.scoreNote!.qstamp),
                    'pitchname': pair.scoreNote!.pname!,
                    'octave': pair.scoreNote!.octave!,
                    'accidentals': pair.scoreNote!.accid!,
                    'midi.pitch': pair.midiNote!.pitch,
                    'midi.onset': pair.midiNote!.onsetTime,
                    'midi.duration': pair.midiNote!.duration,
                    'midi.velocity': pair.midiNote!.velocity,
                    duration: pair.scoreNote!.duration
                }
            })
    }

    public serialize() {
        return {
            'msm': {
                '@': {
                    title: 'aligned performance',
                    pulsesPerQuarter: 720,
                },
                'global': {
                    'header': {},
                    'dated': {
                        'timeSignatureMap': {
                            'timeSignature': {
                                '@': {
                                    'date': 0.0,
                                    'numerator': 3,
                                    'denominator': 4,
                                }
                            }
                        },
                        'sectionMap': {
                            // TODO: derive from FormalAlterations
                            'section': {
                                '@': {
                                    date: 0.0,
                                    'date.end': this.allNotes[this.allNotes.length - 1].date
                                }
                            }
                        },
                    }
                },
                'part': Array.from(Array(2).keys()).map(part => {
                    return {
                        '@': {
                            name: `part${part}`,
                            number: `${part + 1}`,
                            'midi.port.channel': part,
                            'midi.port': 0
                        },
                        header: {},
                        dated: {
                            'keySignatureMap': {
                                'keySignature': {
                                    '@': {
                                        date: 0
                                    }
                                }
                            }
                        },
                        score: {
                            'note': this.allNotes.filter(note => note.part === part)
                        }
                    }
                })
            }
        }
    }

    /**
     * Returns all notes present at a given score date in a given
     * part.
     * @param tstamp score date
     * @param part if "global", all parts will be considered
     * @returns array of MSM notes
     */
    public notesAtDate(tstamp: number, part: Part): MsmNote[] {
        return this.allNotes.filter(note => {
            return (typeof part === 'number') ?
                (note.date === tstamp && note.part === part) // a specific part
                : (note.date === tstamp) // consider all parts
        })
    }

    /**
     * Generates a homophonized version of the MSM score.
     * @returns 
     */
    public asChords(): Chords {
        return this.allNotes.reduce((prev: any, curr) => {
            if (prev[curr.date]) {
                prev[curr.date].push(curr)
            }
            else {
                prev[curr.date] = [curr]
            }
            return prev
        }, {})
    }

    /**
     * Returns the last date, at which a note is present.
     * @returns score date in ticks
     */
    public lastDate(): number {
        return Math.max(...this.allNotes.map(note => note.date))
    }
}
