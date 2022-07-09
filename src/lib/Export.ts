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
    bpm: number,
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

    /**
     * Exports tempo map based on the Douglas-Peucker algorithm.
     * 
     * @param beatLength The length of a beat. Should be derived from time signature.
     * @returns array of <tempo> elements
     */
    public exportTempoMap_dp(beatLength = 1): Tempo[] {
        if (!this.alignedPerformance.score) return []
        let tempoMap: Tempo[] = []
    
        const generatepPowFunction = (frameBegin: number, frameEnd: number, bpm: number, transitionTo: number, meanTempoAt: number) => {
            return (x: number) => Math.pow((x-frameBegin)/(frameEnd-frameBegin), Math.log(0.5)/Math.log(meanTempoAt)) * (transitionTo-bpm) + bpm;
        }
    
        type InterpolationPoint = {
            qstamp: number, 
            bpm: number
        }
        
        function douglasPeucker(points: InterpolationPoint[], epsilon: number) {
            const start = points[0]
            const end = points[points.length-1]
            const meanTempo = (start.bpm + end.bpm)/2

            console.log('douglasPeucker [', start.qstamp, '-', end.qstamp, '], [', start.bpm, '-', end.bpm, ']')
            console.log('searching in points', points, 'for bpm closest to meanTempo', meanTempo)
    
            // search for bpm value closest to meanTempo
            let optimal = Number.MAX_SAFE_INTEGER
            let meanTempoAtQstamp = 0;
            for (let i=1; i<points.length-1; i++) {
                const distance = Math.abs(points[i].bpm - meanTempo)
                if (distance < optimal) {
                    optimal = distance
                    meanTempoAtQstamp = points[i].qstamp;
                }
            }
            console.log('optimal distance=', optimal, 'meanTempoAtQstamp=', meanTempoAtQstamp)
            const fullDistance = end.qstamp - start.qstamp

            if (fullDistance > beatLength) {
                const meanTempoAt = (meanTempoAtQstamp - start.qstamp) / fullDistance 
                console.log('meanTempoAt=', meanTempoAt)
            
                // create a new tempo curve
                const powFunction = generatepPowFunction(start.qstamp, end.qstamp, start.bpm, end.bpm, meanTempoAt)
            
                // find point of maximum distance from this curve
                let dmax = 0
                let index = 0
                for (let i=1; i<points.length-1; i++) {
                    const d = Math.abs(points[i].bpm - powFunction(points[i].qstamp))
                    console.log('d=', points[i].bpm, '-', powFunction(points[i].qstamp))
                    if (d > dmax) {
                        index = i 
                        dmax = d
                    }
                }
            
                if (dmax > epsilon) {
                    douglasPeucker(points.slice(0, index+1), epsilon)
                    douglasPeucker(points.slice(index), epsilon)
                }
                else {
                    tempoMap.push({
                        'date': Score.qstampToTstamp(start.qstamp),
                        'bpm': start.bpm,
                        'transition.to': end.bpm,
                        'beatLength': beatLength / 4,
                        'meanTempoAt': +meanTempoAt.toFixed(2)
                    })
                }
            }
            else {
                tempoMap.push({
                    'date': Score.qstampToTstamp(start.qstamp),
                    'bpm': start.bpm,
                    'beatLength': beatLength / 4
                })
            }
        }

        let onsets: number[] = []
        let qstamps: number[] = []
        for (let i=0; i<this.alignedPerformance.score.getMaxQstamp(); i += beatLength) {
            qstamps.push(i)
            // TODO arpeggio?
            const performedNotes = this.alignedPerformance.performedNotesAtQstamp(i)
            if (performedNotes && performedNotes[0]) onsets.push(performedNotes[0].onsetTime)
            else console.log('?', i) // TODO rest?
        }
        const bpms = asBPM(onsets)

        const points: InterpolationPoint[] = bpms.map((bpm, i) => ({
            qstamp: qstamps[i], 
            bpm: bpm
        }))

        douglasPeucker(points, 10)
        
        return tempoMap
    }

    /**
     * export tempo map based on a naive approach of prolonged trends.
     * 
     * @param beatLength ideally deduced from time signature.
     * @returns 
     */
    exportTempoMap(beatLength = 1): Tempo[] {
        if (!this.alignedPerformance.ready() || !this.alignedPerformance.score) return []

        const determineAgogicShape = (diff: number) => {
            if (diff < 0)       return AgogicShape.Rit
            else if (diff > 0)  return AgogicShape.Acc
            else                return AgogicShape.Neutral
        }

        if (!this.alignedPerformance.score) return []

        // TODO use time signature
        const onsetNotes = []
        for (let i=0; i<this.alignedPerformance.score?.getMaxQstamp(); i += beatLength) {
            // TODO arpeggio?
            const performedNotes = this.alignedPerformance.performedNotesAtQstamp(i)
            if (performedNotes && performedNotes[0]) onsetNotes.push(performedNotes[0])
            else console.log('?', i) // TODO rest?
        }
        const onsets = onsetNotes.map(note => note.onsetTime)
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
            bpm: bpms[0],
            shape: AgogicShape.Neutral
        }

        for (let i=0; i<bpms.length-1; i++) {
            const currentShape = determineAgogicShape(bpms[i+1] - bpms[i])
            console.log(bpms[i], '-', bpms[i+1], '-> currentShape=', currentShape)

            if (currentShape === trend.shape) {
                // prolong the existing trend
                console.log('prolonging an existing trend')
                trend.end = onsets[i+2]
            } else {
                // a trend has finished:
                // create a new <tempo> element and insert it into <tempoMap>
                const frameBegin = this.alignedPerformance.qstampOfOnset(trend.begin)
                const frameEnd = this.alignedPerformance.qstampOfOnset(trend.end)

                console.log('trend from', frameBegin, 'to', frameEnd, '(', trend.bpm, '-', bpms[i], ')')

                if (frameBegin === -1 || frameEnd === -1) {
                    console.log('qstamp of frameBegin or frameEnd could not be determined.')
                    // we failed. set a new trend anyways and try to proceed
                    trend.begin = onsets[i]
                    trend.end = onsets[i+2]
                    trend.shape = currentShape
                    continue
                }

                // insert result into MPM
                const tempoAttributes: Tempo = {
                    'date': Score.qstampToTstamp(frameBegin),
                    'bpm': +trend.bpm.toFixed(1),
                    'beatLength': beatLength / 4
                }
                
                // Take values in between frameBegin and frameEnd into consideration
                let notes = this.alignedPerformance.score.notesInRange(frameBegin, frameEnd)

                let internalNotes: MidiNote[] = []
                for (let j=frameBegin; j<frameEnd; j+=beatLength) {
                    const notesAtTime = this.alignedPerformance.performedNotesAtQstamp(j)
                    // TODO: arpeggio?
                    if (notesAtTime && notesAtTime[0]) {
                        internalNotes.push(notesAtTime[0])
                    }
                }
                const internalBpms = asBPM(internalNotes.map(note => note.onsetTime))

                // if there is some internal tempo development going on
                // transition.to and meanTempoAt need to be calculated.
                if (!internalBpms.every(bpm => bpm === internalBpms[0])) {
                    tempoAttributes['transition.to'] = +bpms[i].toFixed(1)
                    // depending on the amount of internal points 
                    // use different algorithm
                    const points = internalBpms.map((bpm, j): Point => ({
                        x: notes[j].qstamp, 
                        y: bpm || 0
                    })).filter((point: Point) => point.y !== 0)

                    const powFunction = (meanTempoAt: number) => {
                        const bpm = internalBpms[0]
                        const transitionTo = bpms[i]
                        if (!transitionTo) throw new Error("transitionTo cannot be calculated")
                        return (x: number) => Math.pow((x-frameBegin)/(frameEnd-frameBegin), Math.log(0.5)/Math.log(meanTempoAt)) * (transitionTo-bpm) + bpm;
                    }

                    tempoAttributes.meanTempoAt = findLeastSquare(powFunction, points)
                }

                tempoMap.push(tempoAttributes)

                // prepare a new trend
                trend.begin = onsets[i+1]
                trend.bpm = bpms[i+1]
                trend.end = 0
                trend.shape = currentShape
            }
        }

        // insert the last bpm value without any further
        // ado (transition.to etc. do not make any sense).
        tempoMap.push({
            date: this.alignedPerformance.tstampOfOnset(onsets[bpms.length-2]),
            bpm: bpms[bpms.length-1],
            beatLength: beatLength / 4
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
                                tempo: this.exportTempoMap_dp().map((tempo: Tempo) => {
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
