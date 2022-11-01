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
import { InterpolateArticulation } from "./InterpolateArticulation";

export const defaultPipelines = {
    'melodic-texture': new Pipeline(
        new InterpolatePhysicalOrnamentation({ part: 0, minimumArpeggioSize: 2, noteOffShiftTolerance: 250, placement: 'before-beat', durationThreshold: 5 }).setNext(
            new InterpolatePhysicalOrnamentation({ part: 1, minimumArpeggioSize: 2, noteOffShiftTolerance: 250, placement: 'on-beat', durationThreshold: 5 }).setNext(
                new InterpolateTempoMap().setNext(
                    new InterpolateArticulation({ part: 0, relativeDurationPrecision: 1, relativeDurationTolerance: 0.1 }).setNext(
                        new InterpolateArticulation({ part: 1, relativeDurationPrecision: 1, relativeDurationTolerance: 0.1 }).setNext(
                            new InterpolateSymbolicOrnamentation().setNext(
                                new InterpolateDynamicsMap({ part: 0, beatLengthBasis: 'everything' }).setNext(
                                    new InterpolateDynamicsMap({ part: 1, beatLengthBasis: 'everything' }).setNext(
                                        new InterpolateAsynchrony({ part: 0, tolerance: 20, precision: 0 }).setNext(
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
            )
        )
    ),
    'chordal-texture': new Pipeline(
        new InterpolatePhysicalOrnamentation().setNext(
            new InterpolateTempoMap().setNext(
                new InterpolateArticulation().setNext(
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
    )
};

export type PipelineName = keyof typeof defaultPipelines
