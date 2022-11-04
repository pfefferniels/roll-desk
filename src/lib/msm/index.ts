import { Mei } from "../mei";
import { AlignedPerformance } from "../AlignedPerformance";
import { Part } from "../mpm";
import { parse } from "js2xmlparser";
import { RawPerformance } from "../midi";
import { loadVerovio, loadDomParser } from '../globals';


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

export type TimeSignature = {
    numerator: number
    denominator: number
}

/**
 * This class represents an MSM encoding.
 */
export class MSM {
    allNotes: MsmNote[]
    timeSignature?: TimeSignature

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
                let duration = Mei.qstampToTstamp(pair.scoreNote!.duration)

                // in case of a duration of 0 we are probably dealing with a grace note
                if (duration === 0) {
                    duration = 180
                }
                
                return {
                    'part': pair.scoreNote!.part,
                    'xml:id': pair.scoreNote!.id,
                    'date': Mei.qstampToTstamp(pair.scoreNote!.qstamp),
                    'duration': Mei.qstampToTstamp(pair.scoreNote!.duration),
                    'pitchname': pair.scoreNote!.pname!,
                    'octave': pair.scoreNote!.octave!,
                    'accidentals': pair.scoreNote!.accid!,
                    'midi.pitch': pair.midiNote!.pitch,
                    'midi.onset': pair.midiNote!.onsetTime,
                    'midi.duration': pair.midiNote!.duration,
                    'midi.velocity': pair.midiNote!.velocity
                }
            })
            .sort((a, b) => a['date'] - b['date'])
        this.timeSignature = alignedPerformance.score?.timeSignature()
    }

    public serialize() {
        if (this.allNotes.length === 0) {
            console.log('no notes to serialize')
            return
        }

        const msm = {
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
                                'numerator': this.timeSignature?.numerator || 4,
                                'denominator': this.timeSignature?.denominator || 4,
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
                        'midi.channel': part,
                        'midi.port': 0
                    },
                    header: {},
                    dated: {
                        'programChangeMap': {
                            'programChange': {
                                '@': {
                                    date: 0,
                                    value: 0
                                }
                            }
                        },
                        score: {
                            'note': this.allNotes
                                .filter(note => note.part === part + 1)
                                .map(note => ({
                                    '@': {
                                        'xml:id': note['xml:id'],
                                        'date': note['date'],
                                        'pitchname': note['pitchname'],
                                        'octave': note['octave'],
                                        'accidentals': note['accidentals'],
                                        'midi.pitch': note['midi.pitch'],
                                        'duration': note['duration']
                                    }
                                }))
                        }
                    }
                }
            })
        }

        return parse('msm', msm)
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
    public asChords(part: Part = 'global'): Chords {
        const notes = part === 'global' ? this.allNotes : this.allNotes.filter(n => n.part-1 === part)
        return notes.reduce((prev: any, curr) => {
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

    /**
     * Returns the last note
     * @returns MSM note
     */
     public lastNote(): MsmNote | undefined {
        return this.allNotes.find(n => n.date === this.lastDate())
    }
}

/**
 * Prepares an MSM from a given MEI encoding with performed MIDI and alignment. 
 * Mostly useful for testing. 
 * 
 * @param mei 
 * @param midi 
 * @param alignment 
 * @returns 
 */
export const prepareMSM = async (mei: string, midi: ArrayLike<number>, alignment?: string): Promise<MSM> => {
    let { read } = await import("midifile-ts");

    const arr = Uint8Array.from(midi);

    const score = new Mei(mei, await loadVerovio(), await loadDomParser());
    const performance = new RawPerformance(read(arr));
    const alignedPerformance = new AlignedPerformance(score, performance);
    if (alignment) {
        await alignedPerformance.loadAlignment(alignment);
    }
    else {
        // if no alignment is given, perform an automatic alignment
        alignedPerformance.performAlignment();
    }
    return new MSM(alignedPerformance);
};
