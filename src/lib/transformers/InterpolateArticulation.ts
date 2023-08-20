import { Articulation, MPM, Part } from "../mpm/index"
import { MSM } from "../msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"
import { v4 } from "uuid"

export interface InterpolateArticulationOptions extends TransformationOptions {
    /**
     * Tolerance to be applied when inside a chord the durations have slightly different lengths.
     */
    relativeDurationTolerance: number

    /**
     * Precision of the relative duration. Given as number of digits after decimal point.
     */
    relativeDurationPrecision: number

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
 * 
 * @note Interpolation of relative duration is tempo-dependent, meaning that its 
 * precision depends on the precision of the tempo interpolation.
 */
export class InterpolateArticulation extends AbstractTransformer<InterpolateArticulationOptions> {
    constructor(options?: InterpolateArticulationOptions) {
        super()

        // set the default options
        this.setOptions(options || {
            relativeDurationTolerance: 0.1,
            relativeDurationPrecision: 1,
            part: 'global'
        })
    }

    public name() { return 'InterpolateArticulation' }

    public transform(msm: MSM, mpm: MPM): string {
        const relativeDurationTolerance = this.options?.relativeDurationTolerance || 0
        const relativeDurationPrecision = this.options?.relativeDurationPrecision || 20

        const inToleranceRange = (x: number, target: number): boolean => x >= (target - relativeDurationTolerance) && x <= (target + relativeDurationTolerance)

        // Interpolate relativeDuration

        const articulations: Articulation[] = []
        const chords = Object.entries(msm.asChords(this.options?.part))
        chords.forEach(([date, chord], i) => {
            if (!chord.length) {
                console.log('empty chord encountered.')
                return
            }

            const chordArticulations: Articulation[] = []
            chord.forEach(note => {
                if (!note.bpm || !note['bpm.beatLength']) {
                    console.log('no bpm defined for the given note', note["xml:id"], 'at date', date)
                    return
                }

                const fullDuration = note.duration
                let relativeDuration = 1.0
                if (note['tickDuration']) {
                    relativeDuration = +(note['tickDuration'] / fullDuration).toFixed(relativeDurationPrecision)
                }

                // if it takes the full length, we don't need to insert any instruction
                if (relativeDuration === 1.0) return

                // is it possible to just attach this note to an existing
                // articulation instruction at the same date?
                const lastArticulation = chordArticulations.at(-1)
                if (lastArticulation && inToleranceRange(relativeDuration, lastArticulation.relativeDuration)) {
                    lastArticulation.noteid += ` #${note['xml:id']}`
                    return
                }

                chordArticulations.push({
                    type: 'articulation',
                    'xml:id': `articulation_${v4()}`,
                    date: +date,
                    noteid: '#' + note['xml:id'],
                    relativeDuration: +relativeDuration.toFixed(relativeDurationPrecision)
                })
            })

            // if all the notes were combined into one articulation 
            // instruction for the given date, it is not necessary to 
            // define the noteids.
            if (chordArticulations.length === 1) {
                delete chordArticulations[0].noteid
            }

            articulations.push(...chordArticulations)
        })

        mpm.insertInstructions(articulations, this.options?.part !== undefined ? this.options.part : 'global')

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
