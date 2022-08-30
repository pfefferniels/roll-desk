import { MidiNote } from "./Performance"
import { AlignedPerformance } from "./AlignedPerformance"
import { Note, Score } from "./Score"
import { MSM } from "./Msm"
import { InterpolatePhysicalOrnamentation } from "./InterpolatePhysicalOrnamentation"
import { InterpolateTempoMap } from "./InterpolateTempoMap"

type Dynamics = {
    date: number,
    volume: number | string,
    'transition.to'?: number
}

/**
 * Performs the interpolation of an aligned performance
 * into MPM.
 */
export class Interpolation {
    alignedPerformance: AlignedPerformance
    timingImprecision: number = 0

    /**
     * working copy of the MSM on which multiple 
     * operations are performed in the process of 
     * the alignment.
     */
    currentMSM: MSM

    /**
     * working copy of MPM which during the process of 
     * interpolation is gradually filled with MPM elements.
     */
    currentMPM: any

    constructor(alignedPerformance: AlignedPerformance, preferArpeggio: boolean) {
        this.alignedPerformance = alignedPerformance
        this.currentMSM = new MSM(alignedPerformance)

        const nParts = alignedPerformance.score?.countParts() || 0
        this.currentMPM = {
            "@": {
                xmlns: "http://www.cemfi.de/mpm/ns/1.0"
            },
            performance: {
                "@": {
                    name: '',
                    pulsesPerQuarter: 720
                },
                global: {
                    dated: {
                        'tempoMap': {},
                        'ornamentationMap': {},
                        'imprecisionMap.timing': {}
                    }
                },
                part: Array.from(Array(nParts).keys()).map(i => {
                    return {
                        "@": {
                            name: `part${i}`,
                            number: `${i + 1}`,
                            "midi.channel": `${i}`,
                            "midi.port": "0"
                        },
                        dated: {
                            dynamicsMap: {},
                            asynchronyMap: {},
                            ornamentationMap: {},
                            articulationMap: {}
                        }
                    }
                })
            }
        }


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

    private perfDateOfPhysicalTime(absoluteTime: number) {
        // this relies on data from perform_interpolate Tempo
        // with a bpm for any given point in time it is possible
        // to convert physiscal time into symbolic time
        
        // get BPM and its beatLength at absoluteTime
        let bpm = 60, beatLength = 720
        return absoluteTime * bpm * beatLength / 60
    }

    private perform_finalizeGlobalOrnamentation() {

    }

    private perform_interpolateDynamics(part = 0) {
        type TimedVelocity = {
            qstamp: number,
            velocity: number | undefined
        }

        const performedVelocities =
            this.alignedPerformance.score?.allNotes()
                .filter((note: Note) => note.part === part)
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
            if (acc[acc.length - 1] && curr.velocity === acc[acc.length - 1].volume) return acc

            // find trends
            const first = acc[acc.length - 2]
            const second = acc[acc.length - 1]
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

        this.currentMPM.performance.part[part].dated.dynamicsMap.dynamics = dynamics.map(d => ({ '@': d }))
    }

    exportMPM(performanceName: string, tempoReference: number, curvatureReference: number) {
        if (!this.alignedPerformance.score) return

        const interpolatePhysicalOrnamentation = new InterpolatePhysicalOrnamentation()
        const interpolateTempoMap = new InterpolateTempoMap()

        interpolatePhysicalOrnamentation.
            setNext(interpolateTempoMap)
        
        interpolatePhysicalOrnamentation.transform(this.currentMSM, this.currentMPM)

        this.perform_finalizeGlobalOrnamentation()

        const nParts = this.alignedPerformance.score?.countParts() || 0
        for (let i = 0; i < nParts; i++) {
            this.perform_interpolateDynamics(i)
        }

        this.currentMPM.performance["@"].name = performanceName
        return this.currentMPM
    }
}
