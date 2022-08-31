import { MPM } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer } from "./Transformer"

export class InterpolateTimingImprecision extends AbstractTransformer {
    public transform(msm: MSM, mpm: MPM): string {
        // Welte-Mignon piano rolls have an avarage imprecision range of 10ms.
        const timingImprecision = {
            'distribution.uniform': {
                '@': {
                    'date': 0.0,
                    'limit.lower': -10,
                    'limit.upper': 10
                }
            }
        }

        // mpm.insertInstructions(..., 'global')

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
