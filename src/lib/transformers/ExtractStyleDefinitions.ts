import { MPM, Ornament, Part } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer } from "./Transformer"

/**
 * This transformer tries to combine multiple instructions
 * into fewer definitions, taking a given tolerance into account.
 */
export class ExtractStyleDefinitions extends AbstractTransformer {
    tolerance: number
    part: Part

    constructor(part: Part, tolerance = 0.0) {
        super()
        this.part = part
        this.tolerance = tolerance
    }

    public transform(msm: MSM, mpm: MPM): string {
        mpm.getInstructions<Ornament>('ornament', this.part).forEach(ornament => {
            if (ornament['frame.start'] && ornament['frameLength']) {
                // TODO: find a possibly existing definition which is in the
                // range of tolerance. If found, merge.
                const definitionName = mpm.insertDefinition({
                    type: 'ornament',
                    frameLength: ornament.frameLength,
                    "frame.start": ornament["frame.start"]
                }, this.part)
                delete ornament["frame.start"]
                delete ornament["frameLength"]
                ornament["name.ref"] = definitionName
            }
        })

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
