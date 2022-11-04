import { uuid } from "../globals";
import { MPM, Tempo } from "../mpm";
import { MSM } from "../msm";
import { BeatLengthBasis, calculateBeatLength } from "./BeatLengthBasis";
import { AbstractTransformer, TransformationOptions } from "./Transformer";

const asBPM = (arr: number[]) => arr.slice(1).map((n, i) => n - arr[i]).filter(n => n !== 0).map(d => +(60 / d).toFixed(3))

export interface InterpolateTempoMapOptions extends TransformationOptions {
    beatLength: BeatLengthBasis

    /**
     * Tolerance of the Dogulas-Peucker algorithm
     */
    epsilon: number

    /**
     * The number of digits to appear after the decimal point of a BPM value
     */
    precision: number
}

/**
 * Interpolates the global tempo and inserts it into the MPM
 */
export class InterpolateTempoMap extends AbstractTransformer<InterpolateTempoMapOptions> {
    constructor(options?: InterpolateTempoMapOptions) {
        super()

        // set the default options
        this.setOptions(options || {
            beatLength: 'denominator',
            epsilon: 4,
            precision: 0
        })
    }

    public name() { return 'InterpolateTempoMap' }

    transform(msm: MSM, mpm: MPM): string {
        if (!msm.timeSignature) {
            console.warn('A time signature must be given to interpolate a tempo map.')
            return super.transform(msm, mpm);
        }

        let tempos: Tempo[] = []

        const generatepPowFunction = (frameBegin: number, frameEnd: number, bpm: number, transitionTo: number, meanTempoAt: number) => {
            return (x: number) => Math.pow((x - frameBegin) / (frameEnd - frameBegin), Math.log(0.5) / Math.log(meanTempoAt)) * (transitionTo - bpm) + bpm;
        }

        type InterpolationPoint = {
            tstamp: number,
            bpm: number,
            beatLength: number
        }

        function douglasPeucker(points: InterpolationPoint[], epsilon: number) {
            if (!points.length) {
                console.log('not enough notes present')
                return
            }

            const start = points[0]
            const end = points[points.length - 1]
            const meanTempo = (start.bpm + end.bpm) / 2

            // console.log('douglasPeucker [', start.tstamp, '-', end.tstamp, '], [', start.bpm, '-', end.bpm, ']')

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

            // In case of constant tempo no tempo curve needs to be 
            // interpolated.
            if (start.bpm !== end.bpm && fullDistance > start.beatLength) {
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
                        'type': 'tempo',
                        'xml:id': 'tempo_' + uuid(),
                        'date': start.tstamp,
                        'bpm': start.bpm,
                        'transition.to': end.bpm,
                        'beatLength': start.beatLength / 720 / 4,
                        'meanTempoAt': +meanTempoAt.toFixed(2)
                    })

                    msm.allNotes.forEach(n => {
                        n['bpm'] = powFunction(n.date)
                        n['bpm.beatLength'] = start.beatLength
                    })
                }
            }
            else {
                tempos.push({
                    'type': 'tempo',
                    'xml:id': 'tempo_' + uuid(),
                    'date': start.tstamp,
                    'bpm': start.bpm,
                    'beatLength': start.beatLength / 720 / 4
                })
                msm.allNotes.forEach(n => {
                    n['bpm'] = start.bpm
                    n['bpm.beatLength'] = start.beatLength
                })
            }
        }

        let onsets: number[] = []
        let tstamps: number[] = []
        let beatLengths: number[] = []

        if (this.options?.beatLength === 'everything') {
            const chords = Object.entries(msm.asChords())
            chords.forEach(([date, chord], i) => {
                if (chord.length === 0) {
                    console.warn('Empty chord found. This is not supposed to happen.')
                    return
                }

                onsets.push(chord[0]['midi.onset'])
                tstamps.push(+date)
                if (i === chords.length - 1) {
                    // in case of the last chord use its duration as the beat length
                    beatLengths.push(chord[0]['duration'])
                }
                else {
                    // otherwise use the distance to the next chord as beat length
                    beatLengths.push((+chords[i+1][0]) - (+date))
                }
            })
        }
        else {
            let beatLength = calculateBeatLength(this.options?.beatLength || 'bar', msm.timeSignature);

            for (let date = 0; date < msm.lastDate(); date += beatLength) {
                const performedNotes = msm.notesAtDate(date, 'global')

                if (performedNotes && performedNotes[0]) {
                    onsets.push(performedNotes[0]["midi.onset"])
                    tstamps.push(date)
                    beatLengths.push(beatLength)
                }
                else {
                    // if a tstamp has no notes, this probably 
                    // indicates rests which can safely be ignored.
                    // TODO is this correct?
                    console.log('empty tstamp', date)
                }
            }
        }
        const bpms = asBPM(onsets)

        const points: InterpolationPoint[] = bpms.map((bpm, i) => ({
            tstamp: tstamps[i],
            bpm: +bpm.toFixed(this.options?.precision),
            beatLength: beatLengths[i]
        }))

        douglasPeucker(points, this.options?.epsilon || 4)

        mpm.insertInstructions(tempos, 'global')

        return super.transform(msm, mpm)
    }
}

