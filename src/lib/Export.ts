import { AlignedPerformance } from "./AlignedPerformance"
import { MPM } from "./Mpm"
import { MSM } from "./Msm"
import {
    InterpolateDynamicsMap,
    InterpolatePhysicalOrnamentation,
    InterpolateSymbolicOrnamentation,
    InterpolateTempoMap,
    InterpolateTimingImprecision
} from "./transformers"
import { ExtractStyleDefinitions } from "./transformers/ExtractStyleDefinitions"

/**
 * Performs the interpolation of an aligned performance
 * into MPM.
 */
export class Interpolation {
    alignedPerformance: AlignedPerformance
    performanceName: string
    author: string 
    comment: string


    constructor(alignedPerformance: AlignedPerformance) {
        this.alignedPerformance = alignedPerformance
        this.performanceName = 'unnamed performance'
        this.author = 'unknown'
        this.comment = `generated using the MPM interpolation tool from the
                         "Measuring Early Records" project`

    }

    setPerformanceName(performanceName: string) {
        this.performanceName = performanceName
    }

    setAuthor(author: string) {
        this.author = author
    }

    setComment(comment: string) {
        this.comment = comment
    }

    setPreferArpeggio(preferArpeggio: boolean) {

    }

    setTempoReference(tempoRef: number) {

    }

    setAimedPrecision() {
        
    }

    exportMPM(performanceName: string): MPM | undefined {
        if (!this.alignedPerformance.score) return

        // working copy of MPM which during the process of 
        // interpolation is gradually filled with MPM elements.
        const mpm = new MPM(this.alignedPerformance.score.countParts())
        mpm.setPerformanceName(performanceName)
        mpm.setMetadata({
            authors: [this.author],
            comments: [this.comment],
            relatedResources: [{
                uri: `${performanceName}.msm`,
                type: 'msm'
            }]
        })

        // working copy of the MSM on which multiple 
        // operations are performed in the process of 
        // the alignment.
        const msm = new MSM(this.alignedPerformance)

        const interpolatePhysicalOrnamentation = new InterpolatePhysicalOrnamentation()
        const interpolateTempoMap = new InterpolateTempoMap()
        const interpolateSymbolicOrnamentation = new InterpolateSymbolicOrnamentation()
        const interpolateDynamicsLeftHand = new InterpolateDynamicsMap(1)
        const interpolateDynamicsRightHand = new InterpolateDynamicsMap(0)
        const interpolateTimingImprecision = new InterpolateTimingImprecision()
        const interpolateStylesGlobal = new ExtractStyleDefinitions('global')
        const interpolateStylesLeftHand = new ExtractStyleDefinitions(1)
        const interpolateStylesRightHand = new ExtractStyleDefinitions(0)

        interpolatePhysicalOrnamentation
            .setNext(interpolateTempoMap)
            .setNext(interpolateSymbolicOrnamentation)
            .setNext(interpolateDynamicsLeftHand)
            .setNext(interpolateDynamicsRightHand)
            .setNext(interpolateStylesGlobal)
            .setNext(interpolateStylesLeftHand)
            .setNext(interpolateStylesRightHand)
            .setNext(interpolateTimingImprecision)

            // start the transformation chain
        interpolatePhysicalOrnamentation.transform(msm, mpm)

        return mpm
    }
}
