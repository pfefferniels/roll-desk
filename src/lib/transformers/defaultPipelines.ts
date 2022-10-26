import { Pipeline } from "./Pipeline";
import {
    InterpolateDynamicsMap,
    InterpolatePhysicalOrnamentation,
    InterpolateSymbolicOrnamentation,
    InterpolateTempoMap,
    InterpolateTimingImprecision
} from ".";
import { ExtractStyleDefinitions } from "./ExtractStyleDefinitions";
import { InterpolateAsynchrony } from "./InterpolateAsynchrony";

export const defaultPipelines = {
    'melodic-texture': new Pipeline(
        new InterpolatePhysicalOrnamentation({ part: 0, minimumArpeggioSize: 2, durationThreshold: 5 }).setNext(
            new InterpolatePhysicalOrnamentation({ part: 1, minimumArpeggioSize: 2, durationThreshold: 5 }).setNext(
                new InterpolateTempoMap().setNext(
                    new InterpolateSymbolicOrnamentation().setNext(
                        new InterpolateDynamicsMap({ part: 0, beatLengthBasis: 'everything' }).setNext(
                            new InterpolateDynamicsMap({ part: 1, beatLengthBasis: 'everything' }).setNext(
                                new InterpolateAsynchrony({ part: 0, tolerance: 20 }).setNext(
                                    new InterpolateTimingImprecision().setNext(
                                        new ExtractStyleDefinitions()
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    ),
    'chordal-texture': new Pipeline(
        new InterpolatePhysicalOrnamentation().setNext(
            new InterpolateTempoMap().setNext(
                new InterpolateSymbolicOrnamentation().setNext(
                    new InterpolateDynamicsMap().setNext(
                        new InterpolateTimingImprecision().setNext(
                            new ExtractStyleDefinitions()
                        )
                    )
                )
            )
        )
    )
};

export type PipelineName = keyof typeof defaultPipelines
