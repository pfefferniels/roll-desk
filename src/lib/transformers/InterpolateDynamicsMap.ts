import { BeatLengthBasis } from "./BeatLengthBasis"
import { uuid } from "../globals"
import { Dynamics, MPM, Part } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"

export interface InterpolateDynamicsMapOptions extends TransformationOptions {
    /**
     * Defines if the dynamics will be interpolated globally as opposed
     * to referring to parts. Default is 'global'.
     */
    part: Part

    /**
     * Defines the beat length, on which the calculation of tempo is done.
     * Should be given in time stamps (e.g. 720 ...)
     */
    beatLengthBasis: BeatLengthBasis
}

export class InterpolateDynamicsMap extends AbstractTransformer<InterpolateDynamicsMapOptions> {
    constructor(options?: InterpolateDynamicsMapOptions) {
        super()

        // set the default options
        this.setOptions(options || {
            part: 'global',
            beatLengthBasis: 'everything'
        })
    }

    public name() { return 'InterpolateDynamicsMap' }

    public transform(msm: MSM, mpm: MPM): string {
        type TimedVelocity = {
            date: number,
            volume: number | undefined
        }

        const affectedNotes =
            this.options?.part === 'global' ?
                msm.allNotes :
                msm.allNotes.filter(n => n.part - 1 === this.options?.part)

        let performedVelocities: TimedVelocity[] = []
        if (this.options?.beatLengthBasis === 'everything') {
            performedVelocities =
                affectedNotes.map(n => {
                    return {
                        date: n.date,
                        volume: n['midi.velocity']
                    }
                })
        }
        else {
            console.warn('beat length basis other then "everything" not yet implemented')
            return super.transform(msm, mpm)
        }

        if (!performedVelocities.length) return 'no performed velocities found'

        // find trends
        const dynamics = performedVelocities.reduce((acc, curr) => {
            if (!curr.volume) return acc

            // avoid doublettes: if the volumes are exactly 
            // identical, we do not need to do anything.
            if (acc[acc.length - 1] && curr.volume === acc[acc.length - 1].volume) return acc

            // multiple dynamics inside a chord ...
            if (acc[acc.length - 1] && curr.date === acc[acc.length - 1].date) {
                // ... should have been encoded by the InterpolatePhysicalOrnamentation transformer,
                // therefore they will be ignored here. They might be interpolated as ornamentation
                // containing only a <dynamicsGradient> – or they will be left for articulation
                // interpolation.
                return acc
            }

            // find trends
            const first = acc[acc.length - 2]
            const second = acc[acc.length - 1]
            if (first && second) {
                if ((first.volume < second.volume && second.volume < curr.volume) || // crescendo trend
                    (first.volume > second.volume && second.volume > curr.volume)) { // or decrescendo trend
                    // remove middle element (last in acc array)
                    // and insert a transitionTo in the one before
                    acc.pop()
                    first["transition.to"] = curr.volume
                }
            }

            acc.push({
                type: 'dynamics',
                date: curr.date,
                volume: curr.volume,
                'xml:id': 'dynamics_' + uuid()
            })
            return acc
        }, new Array<Dynamics>())

        mpm.insertInstructions(dynamics, this.options?.part || 'global')

        // TODO: before handing over to the next transformer, 
        // the synthesized dynamics should be substracted from
        // the original dynamics, so that following transformers
        // can deal with the difference between *should* and *is*.
        return super.transform(msm, mpm)
    }
}
