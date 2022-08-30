import { AlignedPerformance } from "./AlignedPerformance"
import { MSM } from "./Msm"
import { InterpolateDynamicsMap,
         InterpolatePhysicalOrnamentation,
         InterpolateSymbolicOrnamentation,
         InterpolateTempoMap } from "./transformers"

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

    exportMPM(performanceName: string, tempoReference: number, curvatureReference: number) {
        if (!this.alignedPerformance.score) return

        const interpolatePhysicalOrnamentation = new InterpolatePhysicalOrnamentation()
        const interpolateTempoMap = new InterpolateTempoMap()
        const interpolateSymbolicOrnamentation = new InterpolateSymbolicOrnamentation()
        const interpolateDynamicsLeftHand = new InterpolateDynamicsMap(1)
        const interpolateDynamicsRightHand = new InterpolateDynamicsMap(0)

        interpolatePhysicalOrnamentation.
            setNext(interpolateTempoMap).
            setNext(interpolateSymbolicOrnamentation).
            setNext(interpolateDynamicsLeftHand).
            setNext(interpolateDynamicsRightHand)

        interpolatePhysicalOrnamentation.transform(this.currentMSM, this.currentMPM)

        this.currentMPM.performance["@"].name = performanceName
        return this.currentMPM
    }
}
