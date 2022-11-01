import {MPM, Part } from "../mpm"
import { MSM } from "../msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"
import { BeatLengthBasis } from "./BeatLengthBasis"

export interface InterpolateRubatoOptions extends TransformationOptions {
    /**
     * The length of the frame. Typically identical to the beat length of 
     * tempo interpolation, so that sub-agogics can be covered by rubato.
     */
    frameLength: BeatLengthBasis

    /**
     * The part on which the transformer is to be applied to.
     */
    part: Part
}

/**
 * Interpolates <rubato> elements.
 */
export class InterpolateRubato extends AbstractTransformer<InterpolateRubatoOptions> {
    constructor(options?: InterpolateRubatoOptions) {
        super()

        // set the default options
        this.setOptions(options || {
            frameLength: 'bar',
            part: 'global'
        })
    }

    public name() { return 'InterpolateRubato' }

    public transform(msm: MSM, mpm: MPM): string {
        const chords = Object.entries(msm.asChords(this.options?.part))
        chords.forEach(([date, chord]) => {
            if (!chord.length) {
                console.log('empty chord encountered.')
                return
            }

            /*
            introduce new field epsiolon to MSM to describe the difference 
            between the current interpolated onset time and the real onset 
            time. Subsequent transformers can then do their work in order 
            to reduce epsiolon to a minimum.
            */
        })

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
