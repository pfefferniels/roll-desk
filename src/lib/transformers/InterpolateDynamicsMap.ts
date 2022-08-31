import { Dynamics, MPM } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer } from "./Transformer"

export class InterpolateDynamicsMap extends AbstractTransformer {
    part: number 

    constructor(part: number) {
        super()
        this.part = part
    }

    public transform(msm: MSM, mpm: MPM): string {
        type TimedVelocity = {
            date: number,
            volume: number | undefined
        }

        const performedVelocities =
            msm.allNotes.
                filter(n => n.part === this.part)
                .map((n): TimedVelocity => {
                    return {
                        date: n.date,
                        volume: n['midi.velocity']
                    }
                })

        if (!performedVelocities) return 'no performed velocities found'

        // find trends
        const dynamics = performedVelocities.reduce((acc, curr) => {
            if (!curr.volume) return acc

            // avoid doublettes
            if (acc[acc.length - 1] && curr.volume === acc[acc.length - 1].volume) return acc

            // different dynamics inside a chord?
            if (acc[acc.length - 1] && curr.date === acc[acc.length - 1].date) {
                // TODO insert a <dynamicsGradient> to an 
                // existing ornamentation at this date.
                // This might be a case of a temporal spread
                // inserted by Welte-Mignon in order to allow 
                // dynamic gradating.
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
                volume: curr.volume
            })
            return acc
        }, new Array<Dynamics>())

        mpm.insertInstructions(dynamics, this.part)

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}
