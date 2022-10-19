import { MPM, Part } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"

export interface InterpolateAsynchronyOptions extends TransformationOptions {
    /**
     * Defines which part to apply asynchrony for. Global asynchrony is impossible.
     */
    part: Omit<Part, 'global'>

    /**
     * Tolerance in milliseconds for not inserting a new asynchrony instruction
     */
    tolerance: number
}

export class InterpolateAsynchrony extends AbstractTransformer<InterpolateAsynchronyOptions> {
    constructor() {
        super()

        // set the default options
        this.setOptions({
            part: 1,
            tolerance: 10
        })
    }

    public name() { return 'InterpolateAsynchrony' }

    public transform(msm: MSM, mpm: MPM): string {
        // calculate the difference to the other part 
        // for every tstamp
        
        return super.transform(msm, mpm)
    }
}
