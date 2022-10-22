import { AlignedPerformance } from "./AlignedPerformance"
import { MPM } from "./Mpm"
import { MSM } from "./Msm"
import { Pipeline, defaultPipelines } from "./transformers"

/**
 * Performs the interpolation of an aligned performance
 * into MPM.
 */
export class Interpolator {
    alignedPerformance: AlignedPerformance
    performanceName: string
    author: string
    comment: string

    pipeline: Pipeline

    constructor(alignedPerformance: AlignedPerformance, defaultPipeline: 'chordal-texture' | 'melodic-texture') {
        this.alignedPerformance = alignedPerformance
        this.performanceName = 'unnamed performance'
        this.author = 'unknown'
        this.comment = `generated using the MPM interpolation tool from the
                         "Measuring Early Records" project`

        // the preconfigured pipelines
        this.pipeline = defaultPipelines[defaultPipeline]
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

    setPipeline(pipeline: Pipeline) {
        this.pipeline = pipeline
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

        // construct the pipeline from the given order in this.pipeline
        if (!this.pipeline.head) {
            console.log('No pipeline has been configured. The resulting MPM will be empty.')
            return mpm
        }

        this.pipeline.head.transform(msm, mpm)
        return mpm
    }
}

