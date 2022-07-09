import { MidiNote } from "./Performance"
import { AlignedPerformance } from "./AlignedPerformance"
import { Note, Score } from "./Score"

const asBPM = (arr: number[]) => arr.slice(1).map((n, i) => n - arr[i]).filter(n => n !== 0).map(d => +(60/d).toFixed(3))

type Point = {
    x: number,
    y: number
}

const findLeastSquare = (powFunction: (meanTempo: number) => (x: number) => number, dataPoints: Point[]) => {
    let optimal = 9999999
    let optimalAttempt = -1
    for (let attempt = 0.1; attempt < 1.0; attempt += 0.1) {
        let totalDiffs = 0;
        for (let i=0; i<dataPoints.length; i++) {
            const diff = Math.abs(powFunction(attempt)(dataPoints[i].x) - dataPoints[i].y)
            totalDiffs += diff
        }
        if (totalDiffs < optimal) {
            optimal = totalDiffs
            optimalAttempt = attempt
        }
    }
    return optimalAttempt
}

enum AgogicShape {
    Acc, 
    Rit,
    Neutral
}

type Trend = {
    begin: number,
    end: number, 
    shape: AgogicShape
}

type Tempo = {
    'date': number,
    'bpm': number,
    'beatLength': number,
    'transition.to'?: number,
    'meanTempoAt'?: number
}

type Dynamics = {
    date: number,
    volume: number | string,
    'transition.to'?: number
}

export class Interpolation {
    alignedPerformance: AlignedPerformance
    preferArpeggio: boolean = false
    timingImprecision: number = 0

    constructor(alignedPerformance: AlignedPerformance, preferArpeggio: boolean) {
        this.alignedPerformance = alignedPerformance
        this.preferArpeggio = preferArpeggio

        // Welte-Mignon piano rolls e.g. have an avarage imprecision range of 10ms.
        this.timingImprecision = 10
    }

    exportImprecisionMapTiming(): any {
        return {
            // Welte-Mignon piano rolls have an avarage imprecision range of 10ms.
                'distribution.uniform': {
                    '@': {
                        'date': 0.0,
                        'limit.lower': -0.5 * this.timingImprecision,
                        'limit.upper': 0.5 * this.timingImprecision
                    }
            }
        }
    }

    private isInTimingImprecisionRangeOf(num: number, ref: number): boolean {
        return false
    }

    // calculates global tempo map
    exportTempoMap(tempoReference = 4, curvatureReference = 0.25): Tempo[] {
        if (!this.alignedPerformance.ready()) return []

        const determineAgogicShape = (diff: number) => {
            if (diff < 0) return AgogicShape.Rit
            else if (diff > 0) return AgogicShape.Acc
            else return AgogicShape.Neutral
        }

        const allDownbeats = this.alignedPerformance.score!.allDownbeats()
        const beatLength = (allDownbeats[1] - allDownbeats[0]) / 4
        const onsets = allDownbeats.map((downbeatQstamp: number): number => {
            // always take the first onset as reference 
            // TODO should be controllable with a parameter.
            const firstMidiNote = this.alignedPerformance.performedNotesAtQstamp(downbeatQstamp)[0]
            if (!firstMidiNote) return 0
            // TODO: what to do, if there's no note but e.g. a rest? estimate it?
            return firstMidiNote.onsetTime
        })
        const bpms = asBPM(onsets)

        // constant tempo throughout in the range of the 
        // expected imprecision? (TODO: this needs to be calculated accumulatively!)
        if (bpms.every(v => this.isInTimingImprecisionRangeOf(v, bpms[0]))) {
            return [{
                date: 0,
                bpm: bpms[0],
                beatLength: beatLength
            }]
        }

        const tempoMap: Tempo[] = []

        const trend: Trend = {
            begin: onsets[0],
            end: 0,
            shape: AgogicShape.Neutral
        }

        for (let i=0; i<bpms.length-1; i++) {
            const currentShape = determineAgogicShape(bpms[i+1] - bpms[i])

            if (currentShape === trend.shape) {
                // prolong the existing trend
                console.log('prolonging an existing trend')
                trend.end = onsets[i+1]
            } else {
                // ein Trend endet –> Kalkulation in Gang setzen, d.h.

                trend.end = onsets[i+1]
                
                const frameBegin = this.alignedPerformance.qstampOfOnset(trend.begin)
                const frameEnd = this.alignedPerformance.qstampOfOnset(trend.end)

                if (frameBegin === -1 || frameEnd === -1) {
                    console.log('qstamp of frameBegin or frameEnd could not be determined.')
                    // we failed. set a new trend anyways and try to proceed
                    trend.begin = onsets[i]
                    trend.end = onsets[i+1] 
                    trend.shape = currentShape
                    continue
                }

                // insert result into MPM
                const tempoAttributes: Tempo = {
                    'date': Score.qstampToTstamp(frameBegin),
                    'bpm': +bpms[i].toFixed(1),
                    'beatLength': beatLength
                }
                
                // Take values in between trend.begin and trend.end into consideration

                let notes = this.alignedPerformance.score!.notesInRange(frameBegin, frameEnd)

                // TODO: internal devision is now based on quarter notes (incrementing by 1). Instead,
                // it should be depending on the current time signature.
                let internalNotes: MidiNote[] = []
                for (let i=frameBegin; i<frameEnd; i++) {
                    const notesAtTime = this.alignedPerformance.performedNotesAtQstamp(frameBegin + i)
                    if (notesAtTime && notesAtTime[0]) {
                        internalNotes.push(notesAtTime[0])
                    }
                }
                const internalBpms = asBPM(internalNotes.map(note => note.onsetTime))
                console.log('internalBpms:', internalBpms)

                // if there is some internal tempo development going on
                // transition.to and meanTempoAt need to be calculated.
                if (!internalBpms.every(bpm => bpm === internalBpms[0])) {
                    tempoAttributes['transition.to'] = +bpms[i+1].toFixed(1)
                    // depending on the amount of internal points 
                    // use different algorithm
                    const points = internalBpms.map((bpm, i): Point => ({
                        x: notes[i].qstamp, 
                        y: bpm || 0
                    })).filter((point: Point) => point.y !== 0)

                    console.log('points:', points)

                    const powFunction = (meanTempoAt: number) => {
                        const bpm = internalBpms[0]
                        const transitionTo = internalBpms.at(-1)
                        if (!transitionTo) throw new Error("transitionTo cannot be calculated")
                        return (x: number) => Math.pow((x-frameBegin)/(frameEnd-frameBegin), Math.log(0.5)/Math.log(meanTempoAt)) * (transitionTo-bpm) + bpm;
                    }

                    tempoAttributes.meanTempoAt = findLeastSquare(powFunction, points)
                }


                tempoMap.push(tempoAttributes)

                // (4) neuen Trend setzen
                trend.begin = onsets[i+1]
                trend.end = 0
                trend.shape = AgogicShape.Neutral
            }
        }

        // insert the last bpm value without any further
        // ado (transition.to etc. do not make any sense).
        tempoMap.push({
            date: this.alignedPerformance.tstampOfOnset(onsets[bpms.length-1]),
            bpm: bpms[bpms.length-1],
            beatLength: beatLength
        })


        return tempoMap
    }

    exportDynamicsMap(partNumber: number): Dynamics[] {
        if (!this.alignedPerformance.ready()) return []

        type TimedVelocity = {
            qstamp: number,
            velocity: number | undefined
        }

        const performedVelocities =
            this.alignedPerformance.score?.allNotes()
                .filter((note: Note) => note.part === partNumber)
                .map((note: Note): TimedVelocity => {
                    return {
                        qstamp: note.qstamp,
                        velocity: this.alignedPerformance.performedNoteAtId(note.id)?.velocity
                    }
                })

        if (!performedVelocities) return []

        // find trends
        const dynamics = performedVelocities.reduce((acc, curr, index, arr) => {
            if (!curr.velocity) return acc

            // avoid doublettes
            if (acc[acc.length-1] && curr.velocity === acc[acc.length-1].volume) return acc

            // find trends
            const first = acc[acc.length-2]
            const second = acc[acc.length-1]
            if (first && second) {
                if ((first.volume < second.volume && second.volume < curr.velocity) || // crescendo trend
                    (first.volume > second.volume && second.volume > curr.velocity)) { // or decrescendo trend
                    // remove middle element (last in acc array)
                    // and insert a transitionTo in the one before
                    acc.pop()
                    first["transition.to"] = curr.velocity
                }
            }

            acc.push({
                    date: 720 * curr.qstamp,
                    volume: curr.velocity
                })
            return acc
        }, new Array<Dynamics>())

        return dynamics
    }

    exportRubatoMap(partNumber: number) {

    }
    exportAsynchronyMap(partNumber: number) {
        // get all places with more than one note per qstamp
    }

    exportMPM(performanceName: string, tempoReference: number, curvatureReference: number) {
        if (!this.alignedPerformance.score) return
        const nParts = this.alignedPerformance.score.countParts()

        return {
                "@": {
                    xmlns: "http://www.cemfi.de/mpm/ns/1.0"
                },
                performance: {
                    "@": {
                        name: performanceName,
                        pulsesPerQuarter: 720
                    },
                    global: {
                        dated: {
                            'tempoMap': {
                                tempo: this.exportTempoMap(tempoReference, curvatureReference).map((tempo: Tempo) => {
                                    return { '@': tempo }
                                }),
                            },
                            'rubatoMap': {
                                rubato: []
                            },
                            'imprecisionMap.timing': this.exportImprecisionMapTiming()
                        }
                    },
                    part: Array.from(Array(nParts).keys()).map(i => {
                        return {
                            "@": {
                                name: `part${i}`,
                                number: `${i+1}`,
                                "midi.channel": `${i}`,
                                "midi.port": "0"
                            },
                            dated: {
                                dynamicsMap: {
                                    dynamics: this.exportDynamicsMap(i+1).map((dynamics: Dynamics) => {
                                                return { '@': dynamics }
                                              }),
                                    },
                                asynchronyMap: []
                            }
                        }
                    })
            }
        }
    }
}
