import { MPM, Ornament, Part } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"

export interface ExtractStyleDefinitionsOptions extends TransformationOptions {
    /**
     * Tolerance applied to the temporal domain such as tempo, rubato, asynchrony
     * and ornamentation. Given in BPM.
     */
    temporalTolerance: number

    /**
     * Tolerance applied to volume values such as dynamics, metrical accentuation
     */
    volumeTolerance: number

    /**
     * standard dynamic definitions e.g. for p, mf, f and loud
     * in the case of Welte
     */
    standardDynamics: { name: string, value: number }[]
}

/**
 * This transformer tries to combine multiple instructions
 * into fewer definitions, taking a given tolerance into account.
 */
export class ExtractStyleDefinitions extends AbstractTransformer<ExtractStyleDefinitionsOptions> {
    part: Part

    constructor(part: Part) {
        super()
        this.part = part

        this.options = {
            // consider 1bpm to be indistinguishable
            temporalTolerance: 1,
            volumeTolerance: 0.5,

            // These are the values used by SUPRA's midi2exp. 
            // Ideally, they should be extracted from the given 
            // MIDI file's metadata.
            standardDynamics: [
                { name: 'p', value: 38 },
                { name: 'mf', value: 60 },
                { name: 'f', value: 85 },
                { name: 'loud', value: 70 }
            ]
        }
    }

    public name() { return 'ExtractStyleDefinitions' }

    public transform(msm: MSM, mpm: MPM): string {
        mpm.getInstructions<Ornament>('ornament', this.part).forEach(ornament => {
            if (ornament['frame.start'] && ornament['frameLength']) {
                // TODO: find a possibly existing definition which is in the
                // range of tolerance. If found, merge.
                let transition: [number | undefined, number | undefined] = [undefined, undefined]
                if (ornament.gradient === 'crescendo') {
                    transition = [-1, 1]
                }
                else if (ornament.gradient === 'decrescendo') {
                    transition = [1, -1]
                }

                const definitionName = mpm.insertDefinition({
                    'type': 'ornament',
                    'frameLength': ornament.frameLength,
                    'frame.start': ornament['frame.start'],
                    'time.unit': ornament['time.unit'],
                    'transition.from': transition[0],
                    'transition.to': transition[1]

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
