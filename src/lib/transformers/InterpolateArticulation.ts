import { DynamicsGradient, MPM, Ornament, Part } from "../mpm"
import { MSM } from "../msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"
import { uuid } from '../globals'

export interface InterpolateArticulationOptions extends TransformationOptions {
    /**
     * Tolerance to be applied when inside a chord the durations have slightly different lengths
     */
    offsetTolerance: number

    /**
     * The part on which the transformer is to be applied to.
     */
    part: Part
}

/**
 * Interpolates the relative duration attribute of the <articulation> element.
 * It can be applied to different parts (melodic preset) or globally (chordal preset).
 * Should be applied after the `InterpolatePhysicalOrnamentation` and the 
 * `InterpolateTempoMap` transformer.
 */
export class InterpolateArticulation extends AbstractTransformer<InterpolateArticulationOptions> {
    constructor(options?: InterpolateArticulationOptions) {
        super()

        // set the default options
        this.setOptions(options || {
            offsetTolerance: 15,
            part: 'global'
        })
    }

    public name() { return 'InterpolateArticulation' }

    public transform(msm: MSM, mpm: MPM): string {
        // interpolate relativeDuration

        const chords = Object.entries(msm.asChords(this.options?.part))
        chords.forEach(([date, chord], i) => {
            if (!chord.length) {
                console.log('empty chord encountered.')
                return
            }

            // soll und ist miteinander vergleichen
        })

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
