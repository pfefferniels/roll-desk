import { MidiNote } from "./Performance"
import { AlignedPerformance } from "./AlignedPerformance"
import { Note, Score } from "./Score"

const asBPM = (arr: number[]) => arr.slice(1).map((n, i) => n - arr[i]).filter(n => n !== 0).map(d => 60/d)

type Point = {
    x: number,
    y: number
}

const findLeastSquare = (powFunction: (meanTempo: number) => (x: number) => number, dataPoints: Point[]) => {
    let optimal = 9999999;
    for (let attempt = 0.1; attempt < 1.0; attempt += 0.1) {
        let totalDiffs = 0;
        for (let i=0; i<dataPoints.length; i++) {
            const diff = Math.abs(powFunction(attempt)(dataPoints[i].x) - dataPoints[i].y)
            totalDiffs += diff
        }
        if (totalDiffs < optimal) optimal = totalDiffs
    }
    return optimal
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

type TempoMap = Tempo[]

type Tempo = {
    "@": any
}

export class Interpolation {
    alignedPerformance: AlignedPerformance
    preferArpeggio: boolean = false

    constructor(alignedPerformance: AlignedPerformance, preferArpeggio: boolean) {
        this.alignedPerformance = alignedPerformance
        this.preferArpeggio = preferArpeggio
    }

    // calculates global tempo map
    exportTempoMap(tempoReference = 4, curvatureReference = 0.25): TempoMap {
        if (!this.alignedPerformance.ready()) return []

        const tempoMap: TempoMap = []

        const allDownbeats = this.alignedPerformance.score!.allDownbeats() 
        const onsets = allDownbeats.map((downbeatQstamp: number): number => {
            // always take the first onset as reference 
            // TODO should be controllable with a parameter.
            const firstMidiNote = this.alignedPerformance.performedNotesAtQstamp(downbeatQstamp)[0]
            // TODO: what to do, if there's no note but e.g. a rest? estimate it?
            return firstMidiNote.onsetTime || 0
        })
        const bpms = asBPM(onsets)

        const trend: Trend = {
            begin: onsets[0],
            end: 0,
            shape: AgogicShape.Neutral
        }

        for (let i=0; i<bpms.length-1; i++) {
            const currentTrend = bpms[i+1] > bpms[i] ? AgogicShape.Acc : AgogicShape.Rit
            console.log('currentTrend', currentTrend)
            if (currentTrend === trend.shape) {
                // prolong the existing trend
                console.log('prolonging an existing trend')
                trend.end = onsets[i+1]
            } else {
                trend.end = onsets[i]
                // ein Trend endet –> Kalkulation in Gang setzen, d.h.

                // (1) alle Werte zwischen trend.begin und trend.end
                //     auf Kurve auftragen
                console.log('a frame has finished, now doing stuff')
                const frameBegin = this.alignedPerformance.qstampOfOnset(trend.begin)
                const frameEnd = this.alignedPerformance.qstampOfOnset(trend.end)

                console.log('there is a trend from', trend.begin, 'to', trend.end)

                if (!frameBegin || !frameEnd) {
                    // we failed. set a new trend anyways and try to proceed
                    trend.begin = onsets[i]
                    trend.end = onsets[i+1] 
                    trend.shape = currentTrend
                    continue
                }

                let notes = this.alignedPerformance.score!.notesInRange(frameBegin, frameEnd)

                //notes = notes.filter(note => (note.qstamp % curvatureReference) === 0).reduce<Note[]>(function (a, b) {
                //    if (a.findIndex(a => a.qstamp === b.qstamp) < 0) a.push(b);
                //    return a;
                //}, []);

                const internalBpms = asBPM(
                    notes.map((note: Note) => this.alignedPerformance.performedNoteAtId(note.id)?.onsetTime || -1))
                
                // depending on the amount of internal points 
                // use different algorithm
                const points = internalBpms.map((bpm, i): Point => ({
                    x: notes[i].qstamp, 
                    y: bpm || 0
                })).filter((point: Point) => point.y !== 0)

                const powFunction = (meanTempoAt: number) => {
                    const bpm = internalBpms[0]
                    const transitionTo = internalBpms.at(-1)
                    if (!transitionTo) throw new Error("transitionTo cannot be calculated")
                    return (x: number) => Math.pow((x-frameBegin)/(frameEnd-frameBegin), Math.log(0.5)/Math.log(meanTempoAt)) * (transitionTo-bpm) + bpm;
                }

                const meanTempoAt = findLeastSquare(powFunction, points)

                // (3) Ergebnis in die MPM einfügen
                const tempoAttributes: any = {
                    'date': this.alignedPerformance.score!.qstampToTstamp(frameBegin),
                    'bpm': Math.round(bpms[i]),
                    'transition.to': Math.round(bpms[i+1]),
                    'meanTempoAt': meanTempoAt,
                    'beatLength': 0.25 * tempoReference
                }
                const tempoElement: Tempo = {
                    "@": tempoAttributes
                }
                tempoMap.push(tempoElement)

                // (4) neuen Trend setzen
                trend.begin = onsets[i]
                trend.end = onsets[i+1] 
                trend.shape = currentTrend
            }
        }

        return tempoMap
    }

    exportDynamicsMap(partNumber: number) {

    }

    exportRubatoMap(partNumber: number) {

    }
    exportAsynchronyMap(partNumber: number) {

    }

    exportMPM(performanceName: string, tempoReference: number, curvatureReference: number) {
        return {
            mpm: {
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
                            tempoMap: {
                                tempo: this.exportTempoMap(tempoReference, curvatureReference),
                            },
                            rubatoMap: {
                                rubato: []
                            }
                        }
                    },
                    part: [{
                        "@": {
                            name: "Right hand",
                            number: "1",
                            "midi.channel": "0",
                            "midi.port": "0"
                        },
                        dated: {
                            dynamicsMap: [],
                            asynchronyMap: []
                        }
                    }, {
                        "@": {
                            name: "Left hand",
                            number: "2",
                            "midi.channel": "1",
                            "midi.port": "0"
                        },
                        dated: {
                            dynamicsMap: {
                                dynamics: 0
                            }
                        }
                    }]
                }
            }
        }
    }
}
