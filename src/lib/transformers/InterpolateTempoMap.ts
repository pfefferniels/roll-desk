import { MPM, Tempo } from "../Mpm";
import { MSM } from "../Msm";
import { AbstractTransformer, TransformationOptions } from "./Transformer";

const asBPM = (arr: number[]) => arr.slice(1).map((n, i) => n - arr[i]).filter(n => n !== 0).map(d => +(60 / d).toFixed(3))

/**
 * Calculation of tempo can be done on the basis of whole bar, 
 * half bar and the denominator values.
 */
export const beatLengthBasis = ['bar', 'halfbar', 'denominator'] as const
export type BeatLengthBasis = typeof beatLengthBasis[number]

export interface InterpolateTempoMapOptions extends TransformationOptions {
    beatLength: BeatLengthBasis
    epsilon: number
}

/**
 * Interpolates the global tempo and inserts it into the MPM
 */
export class InterpolateTempoMap extends AbstractTransformer<InterpolateTempoMapOptions> {
    constructor() {
        super()

        // set the default options
        this.setOptions({
            beatLength: 'denominator',
            epsilon: 4
        })
    }
    public name() { return 'InterpolateTempoMap' }

    transform(msm: MSM, mpm: MPM): string {
        let beatLength = 720
        if (msm.timeSignature && this.options) {
            switch (this.options.beatLength) {
                case 'denominator':
                    beatLength = (4 / msm.timeSignature.denominator) * 720
                    break;
                case 'bar':
                    beatLength = (4 / msm.timeSignature.denominator) * msm.timeSignature.numerator * 720
                    break;
                case 'halfbar':
                    beatLength = (4 / msm.timeSignature.denominator) * 0.5 * msm.timeSignature.numerator * 720
                    break;
            }
        }

        let tempos: Tempo[] = []
    
        const generatepPowFunction = (frameBegin: number, frameEnd: number, bpm: number, transitionTo: number, meanTempoAt: number) => {
            return (x: number) => Math.pow((x - frameBegin) / (frameEnd - frameBegin), Math.log(0.5) / Math.log(meanTempoAt)) * (transitionTo - bpm) + bpm;
        }
    
        type InterpolationPoint = {
            tstamp: number,
            bpm: number
        }
    
        function douglasPeucker(points: InterpolationPoint[], epsilon: number) {
            if (!points.length) {
                console.log('not enough notes present')
                return
            }
    
            const start = points[0]
            const end = points[points.length - 1]
            const meanTempo = (start.bpm + end.bpm) / 2
    
            console.log('douglasPeucker [', start.tstamp, '-', end.tstamp, '], [', start.bpm, '-', end.bpm, ']')
    
            // search for bpm value closest to meanTempo
            let optimal = Number.MAX_SAFE_INTEGER
            let meanTempoAtQstamp = 0;
            for (let i = 1; i < points.length - 1; i++) {
                const distance = Math.abs(points[i].bpm - meanTempo)
                if (distance < optimal) {
                    optimal = distance
                    meanTempoAtQstamp = points[i].tstamp;
                }
            }
            const fullDistance = end.tstamp - start.tstamp
    
            if (fullDistance > beatLength) {
                const meanTempoAt = (meanTempoAtQstamp - start.tstamp) / fullDistance
    
                // create a new tempo curve
                const powFunction = generatepPowFunction(start.tstamp, end.tstamp, start.bpm, end.bpm, meanTempoAt)
    
                // find point of maximum distance from this curve
                let dmax = 0
                let index = 0
                for (let i = 1; i < points.length - 1; i++) {
                    const d = Math.abs(points[i].bpm - powFunction(points[i].tstamp))
                    if (d > dmax) {
                        index = i
                        dmax = d
                    }
                }
    
                if (dmax > epsilon) {
                    douglasPeucker(points.slice(0, index + 1), epsilon)
                    douglasPeucker(points.slice(index), epsilon)
                }
                else {
                    tempos.push({
                        type: 'tempo',
                        'date': start.tstamp,
                        'bpm': start.bpm,
                        'transition.to': end.bpm,
                        'beatLength': beatLength / 720 / 4,
                        'meanTempoAt': +meanTempoAt.toFixed(2)
                    })

                    msm.allNotes.forEach(n => {
                        n['bpm'] = powFunction(n.date)
                        n['bpm.beatLength'] = beatLength
                    })
                }
            }
            else {
                tempos.push({
                    type: 'tempo',
                    'date': start.tstamp,
                    'bpm': start.bpm,
                    'beatLength': beatLength / 720 / 4
                })
                msm.allNotes.forEach(n => {
                    n['bpm'] = start.bpm
                    n['bpm.beatLength'] = beatLength
                })
            }
        }
    
        let onsets: number[] = []
        let tstamps: number[] = []
        for (let date = 0; date < msm.lastDate(); date += beatLength) {
            const performedNotes = msm.notesAtDate(date, 'global')
    
            if (performedNotes && performedNotes[0]) {
                onsets.push(performedNotes[0]["midi.onset"])
                tstamps.push(date)
            }
            else {
                // TODO: if a qstamp has no notes, this probably 
                // indicates rests, possibly filling up to an upbeat.
                console.log('empty tstamp', date)
            }
        }
        const bpms = asBPM(onsets)
    
        const points: InterpolationPoint[] = bpms.map((bpm, i) => ({
            tstamp: tstamps[i],
            bpm: bpm
        }))
    
        douglasPeucker(points, this.options?.epsilon || 4)

        mpm.insertInstructions(tempos, 'global')
    
        return super.transform(msm, mpm)
    }
}

