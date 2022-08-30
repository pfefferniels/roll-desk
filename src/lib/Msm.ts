import { Score } from "./Score";
import { AlignedPerformance } from "./AlignedPerformance";

export type AlignedNote = {
    readonly 'xml:id': string,
    readonly 'part': number,
    readonly 'date': number,
    readonly 'midi.pitch': number,
    readonly 'duration': number
    // TODO: pitchname, accidentals, octave
    'midi.onset': number,
    'midi.duration': number,
}

export type Chords = {
    [tstamp: number]: AlignedNote[]
}

export class MSM {
    allNotes: AlignedNote[]

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

    constructor(alignedPerformance: AlignedPerformance) {
        this.allNotes = alignedPerformance.getSemanticPairs().
            filter(pair => pair.midiNote && pair.scoreNote).
            map(pair => {
                return {
                    part: pair.scoreNote!.part,
                    'xml:id': pair.scoreNote!.id,
                    'date': Score.qstampToTstamp(pair.scoreNote!.qstamp),
                    'midi.pitch': pair.midiNote!.pitch,
                    'midi.onset': pair.midiNote!.onsetTime,
                    'midi.duration': pair.midiNote!.duration,
                    // TODO: pitchname, accidentals, octave
                    duration: pair.scoreNote!.duration
                }
            })

    }

    public notesAtDate(tstamp: number, part?: number): AlignedNote[] {
        return this.allNotes.filter(note => {
            return part ? (note.date === tstamp && note.part === part)
                : (note.date === tstamp)
        })
    }

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

    public lastDate() {
        return Math.max(...this.allNotes.map(note => note.date))
    }
}
