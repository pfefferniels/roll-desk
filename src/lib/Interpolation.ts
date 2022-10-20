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
import { InterpolateAsynchrony } from "./transformers/InterpolateAsynchrony"
import { AbstractTransformer, TransformationOptions } from "./transformers/Transformer"

/**
 * Performs the interpolation of an aligned performance
 * into MPM.
 */
export class Interpolation {
    alignedPerformance: AlignedPerformance
    performanceName: string
    author: string
    comment: string

    pipeline: AbstractTransformer<TransformationOptions>[]

    constructor(alignedPerformance: AlignedPerformance) {
        this.alignedPerformance = alignedPerformance
        this.performanceName = 'unnamed performance'
        this.author = 'unknown'
        this.comment = `generated using the MPM interpolation tool from the
                         "Measuring Early Records" project`

        // the default order of transformations
        this.pipeline = Interpolation.melodicTexturePipeline()
    }

    public optimalPipeline(): AbstractTransformer<TransformationOptions>[] {
        // TODO based on the texture of the piece it
        // tries to identify the optimal interpolation pipeline.
        return []
    }


    public static melodicTexturePipeline(): AbstractTransformer<TransformationOptions>[] {
        return [
            new InterpolatePhysicalOrnamentation({
                part: 0,
                minimumArpeggioSize: 2,
                durationThreshold: 5
            }),
            new InterpolatePhysicalOrnamentation({
                part: 1,
                minimumArpeggioSize: 2,
                durationThreshold: 5
            }),
            new InterpolateTempoMap(),
            new InterpolateSymbolicOrnamentation(),
            new InterpolateDynamicsMap({
                part: 0,
                beatLengthBasis: 'everything'
            }),
            new InterpolateDynamicsMap({
                part: 1,
                beatLengthBasis: 'everything'
            }),
            new InterpolateAsynchrony({
                part: 0,
                tolerance: 20
            }),
            new InterpolateTimingImprecision(),
            new ExtractStyleDefinitions('global'),
            new ExtractStyleDefinitions(1),
            new ExtractStyleDefinitions(0)
        ]
    }


    public static chordalTexturePipeline(): AbstractTransformer<TransformationOptions>[] {
        return [
            new InterpolatePhysicalOrnamentation(),
            new InterpolateTempoMap(),
            new InterpolateSymbolicOrnamentation(),
            new InterpolateDynamicsMap(),
            new InterpolateTimingImprecision(),
            new ExtractStyleDefinitions('global'),
            new ExtractStyleDefinitions(1),
            new ExtractStyleDefinitions(0)
        ]
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

    setPipeline(pipeline: AbstractTransformer<TransformationOptions>[]) {
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
        if (this.pipeline.length > 0) {
            let copy = this.pipeline.slice()
            copy.reduce((acc, curr) => acc.setNext(curr), copy[0])
            const chainedTransformation = copy[0]

            // kick-off the transformation chain
            if (!chainedTransformation) {
                console.log('something went wrong')
                return
            }

            chainedTransformation.transform(msm, mpm)
        }

        return mpm
    }
}

